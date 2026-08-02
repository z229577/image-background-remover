import { NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ensureUser } from '../../../lib/billing';

const TEST_PRODUCTS = {
  plus: 'prod_6ijG91u3LhleUXcO0lBWLs',
  pro: 'prod_62WXclRD7iY11J3vqlCLLL',
} as const;

const LIVE_PRODUCTS = {
  plus: 'prod_4z1qYTsmLd2cXUBIceuWAt',
  pro: 'prod_5IcMJGNsGGWbikizh8yr9P',
} as const;

export async function GET(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.redirect(new URL('/?login=required', request.url));

  const { env } = await getCloudflareContext({ async: true });
  const testMode = (env as { CREEM_TEST_MODE?: string }).CREEM_TEST_MODE === 'true';
  const products = testMode ? TEST_PRODUCTS : LIVE_PRODUCTS;
  const plan = new URL(request.url).searchParams.get('plan') as keyof typeof products | null;
  if (!plan || !(plan in products)) return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });

  const apiKey = (env as { CREEM_API_KEY?: string }).CREEM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Creem is not configured yet.' }, { status: 503 });

  const userId = session.user?.email?.toLowerCase() || email.toLowerCase();
  await ensureUser(userId, email, session.user?.name, session.user?.image);

  const apiBase = testMode ? 'https://test-api.creem.io/v1' : 'https://api.creem.io/v1';
  const response = await fetch(`${apiBase}/checkouts`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: products[plan],
      success_url: `${new URL('/pricing?checkout=success', request.url).toString()}`,
      metadata: { user_id: userId, plan },
    }),
  });
  const payload = await response.json().catch(() => null) as { checkout_url?: string; url?: string; message?: string } | null;
  const checkoutUrl = payload?.checkout_url || payload?.url;
  if (!response.ok || !checkoutUrl) return NextResponse.json({ error: payload?.message || 'Unable to create checkout.' }, { status: 502 });
  return NextResponse.redirect(checkoutUrl);
}
