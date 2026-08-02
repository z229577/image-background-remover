import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { PLAN_CREDITS, type Plan } from '../../../../lib/billing';

async function sign(secret: string, body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const secret = (env as { CREEM_WEBHOOK_SECRET?: string }).CREEM_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get('creem-signature') || '';
  const expected = await sign(secret, raw);
  if (!same(signature.replace(/^sha256=/, '').toLowerCase(), expected)) return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });

  const payload = JSON.parse(raw) as Record<string, any>;
  const eventId = String(payload.id || payload.event_id || crypto.randomUUID());
  const type = String(payload.eventType || payload.type || payload.event || '');
  const data = payload.data || payload.object || payload;
  const metadata = data.metadata || payload.metadata || {};
  const userId = String(metadata.user_id || data.customer?.email || data.customer_email || '').toLowerCase();
  if (!userId) return NextResponse.json({ received: true });

  const db = await getDb();
  const inserted = await db.prepare('INSERT OR IGNORE INTO webhook_events (id, received_at) VALUES (?, ?)')
    .bind(eventId, new Date().toISOString()).run();
  if (inserted.meta.changes === 0) return NextResponse.json({ received: true, duplicate: true });

  const plan = (metadata.plan || data.product?.metadata?.plan) as Plan;
  // checkout.completed grants the initial period; subscription.paid grants renewals.
  // Do not grant on subscription.active as Creem may emit it alongside checkout.completed.
  if ((type === 'checkout.completed' || type === 'subscription.paid') && PLAN_CREDITS[plan]) {
    const now = new Date().toISOString();
    const subscriptionId = String(data.subscription?.id || data.subscription_id || data.id || eventId);
    const customerId = String(data.customer?.id || data.customer_id || '');
    await db.prepare(`INSERT INTO users (id, email, free_credits_reset_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`)
      .bind(userId, userId, now, now, now).run();
    await db.batch([
      db.prepare(`INSERT INTO subscriptions (id, user_id, plan, status, creem_customer_id, creem_subscription_id, current_period_end, created_at, updated_at)
        VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET plan = excluded.plan, status = 'active', updated_at = excluded.updated_at`)
        .bind(subscriptionId, userId, plan, customerId || null, subscriptionId, data.current_period_end || null, now, now),
      db.prepare('UPDATE users SET paid_credits = paid_credits + ?, updated_at = ? WHERE id = ?').bind(PLAN_CREDITS[plan], now, userId),
    ]);
  }
  if (type === 'subscription.canceled' || type === 'subscription.expired' || type === 'subscription.past_due') {
    const subscriptionId = String(data.subscription?.id || data.subscription_id || data.id || '');
    if (subscriptionId) await db.prepare('UPDATE subscriptions SET status = ?, updated_at = ? WHERE creem_subscription_id = ?')
      .bind(type.replace('subscription.', ''), new Date().toISOString(), subscriptionId).run();
  }
  return NextResponse.json({ received: true });
}
