import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

const PLANS: Record<string, { plan: 'plus' | 'pro'; credits: number }> = {
  'P-0YH07638923768646NJXMIRI': { plan: 'plus', credits: 30 },
  'P-90S28937F64255111NJXMIRI': { plan: 'pro', credits: 150 },
  'P-4M024721LM4844357NJXM5OY': { plan: 'plus', credits: 30 },
  'P-3J765497S0062135NNJXM5OY': { plan: 'pro', credits: 150 },
};

async function getToken(clientId: string, secret: string, base: string) {
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await response.json() as { access_token?: string };
  if (!response.ok || !data.access_token) throw new Error('Unable to authenticate with PayPal.');
  return data.access_token;
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const config = env as { PAYPAL_CLIENT_ID?: string; PAYPAL_CLIENT_SECRET?: string; PAYPAL_ENV?: string; PAYPAL_WEBHOOK_ID?: string };
  if (!config.PAYPAL_CLIENT_ID || !config.PAYPAL_CLIENT_SECRET || !config.PAYPAL_WEBHOOK_ID) return NextResponse.json({ error: 'PayPal webhook is not configured.' }, { status: 503 });
  const raw = await request.text();
  const event = JSON.parse(raw) as Record<string, any>;
  const headers = request.headers;
  const base = config.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const token = await getToken(config.PAYPAL_CLIENT_ID, config.PAYPAL_CLIENT_SECRET, base);
  const verify = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ transmission_id: headers.get('paypal-transmission-id'), transmission_time: headers.get('paypal-transmission-time'), cert_url: headers.get('paypal-cert-url'), auth_algo: headers.get('paypal-auth-algo'), transmission_sig: headers.get('paypal-transmission-sig'), webhook_id: config.PAYPAL_WEBHOOK_ID, webhook_event: event }),
  });
  const verification = await verify.json() as { verification_status?: string };
  if (!verify.ok || verification.verification_status !== 'SUCCESS') return NextResponse.json({ error: 'Invalid PayPal webhook signature.' }, { status: 401 });

  const eventId = `paypal:${String(event.id || crypto.randomUUID())}`;
  const db = await getDb();
  const inserted = await db.prepare('INSERT OR IGNORE INTO webhook_events (id, received_at) VALUES (?, ?)').bind(eventId, new Date().toISOString()).run();
  if (inserted.meta.changes === 0) return NextResponse.json({ received: true, duplicate: true });

  const type = String(event.event_type || '');
  const resource = event.resource || {};
  const subscriptionId = String(resource.billing_agreement_id || resource.id || '');
  if (type === 'PAYMENT.SALE.COMPLETED' && subscriptionId) {
    const details = await fetch(`${base}/v1/billing/subscriptions/${subscriptionId}`, { headers: { Authorization: `Bearer ${token}` } });
    const subscription = await details.json() as { custom_id?: string; plan_id?: string; subscriber?: { email_address?: string }; status?: string };
    const userId = String(subscription.custom_id || subscription.subscriber?.email_address || '').toLowerCase();
    const plan = PLANS[String(subscription.plan_id)];
    if (userId && plan) {
      const now = new Date().toISOString();
      await db.prepare(`INSERT INTO users (id, email, free_credits_reset_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`).bind(userId, userId, now, now, now).run();
      await db.batch([
        db.prepare(`INSERT INTO subscriptions (id, user_id, plan, status, creem_subscription_id, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET status = 'active', updated_at = excluded.updated_at`).bind(`paypal:${subscriptionId}`, userId, plan.plan, subscriptionId, now, now),
        db.prepare('UPDATE users SET paid_credits = paid_credits + ?, updated_at = ? WHERE id = ?').bind(plan.credits, now, userId),
      ]);
    }
  }
  if (['BILLING.SUBSCRIPTION.CANCELLED', 'BILLING.SUBSCRIPTION.EXPIRED', 'BILLING.SUBSCRIPTION.SUSPENDED', 'BILLING.SUBSCRIPTION.PAYMENT.FAILED'].includes(type) && subscriptionId) {
    await db.prepare('UPDATE subscriptions SET status = ?, updated_at = ? WHERE creem_subscription_id = ?').bind(type.split('.').at(-1)?.toLowerCase() || 'inactive', new Date().toISOString(), subscriptionId).run();
  }
  return NextResponse.json({ received: true });
}
