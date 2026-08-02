import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { auth } from '../../../../auth';
import { ensureUser } from '../../../../lib/billing';

const PLANS = { plus: 'P-0YH07638923768646NJXMIRI', pro: 'P-90S28937F64255111NJXMIRI' } as const;

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

export async function GET(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.redirect(new URL('/?login=required', request.url));
  const plan = new URL(request.url).searchParams.get('plan') as keyof typeof PLANS | null;
  if (!plan || !PLANS[plan]) return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });
  const { env } = await getCloudflareContext({ async: true });
  const config = env as { PAYPAL_CLIENT_ID?: string; PAYPAL_CLIENT_SECRET?: string; PAYPAL_ENV?: string };
  if (!config.PAYPAL_CLIENT_ID || !config.PAYPAL_CLIENT_SECRET) return NextResponse.json({ error: 'PayPal is not configured yet.' }, { status: 503 });
  const base = config.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const userId = email.toLowerCase();
  await ensureUser(userId, email, session.user?.name, session.user?.image);
  const token = await getToken(config.PAYPAL_CLIENT_ID, config.PAYPAL_CLIENT_SECRET, base);
  const response = await fetch(`${base}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ plan_id: PLANS[plan], custom_id: userId, application_context: { brand_name: 'Image Background Remover', user_action: 'SUBSCRIBE_NOW', return_url: new URL('/pricing?paypal=success', request.url).toString(), cancel_url: new URL('/pricing?paypal=cancelled', request.url).toString() } }),
  });
  const data = await response.json() as { links?: Array<{ rel?: string; href?: string }>; message?: string };
  const approval = data.links?.find((link) => link.rel === 'approve')?.href;
  if (!response.ok || !approval) return NextResponse.json({ error: data.message || 'Unable to create PayPal subscription.' }, { status: 502 });
  return NextResponse.redirect(approval);
}
