import { getDb } from './db';

export const PLAN_CREDITS = { plus: 30, pro: 150 } as const;
export type Plan = keyof typeof PLAN_CREDITS;

function nextMonth() {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString();
}

export async function ensureUser(userId: string, email: string, name?: string | null, image?: string | null) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO users (id, email, name, image, free_credits_reset_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET name = excluded.name, image = excluded.image, updated_at = excluded.updated_at`)
    .bind(userId, email.toLowerCase(), name ?? null, image ?? null, nextMonth(), now, now)
    .run();
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first<Record<string, unknown>>();
  if (!user) throw new Error('Unable to create user.');
  if (String(user.free_credits_reset_at) <= now) {
    await db.prepare('UPDATE users SET free_credits = 3, free_credits_reset_at = ?, updated_at = ? WHERE id = ?')
      .bind(nextMonth(), now, String(user.id)).run();
    user.free_credits = 3;
  }
  return { db, user };
}

export async function consumeCredit(userId: string) {
  const db = await getDb();
  const paid = await db.prepare('UPDATE users SET paid_credits = paid_credits - 1, updated_at = ? WHERE id = ? AND paid_credits > 0')
    .bind(new Date().toISOString(), userId).run();
  if (paid.meta.changes > 0) return 'paid' as const;
  const free = await db.prepare('UPDATE users SET free_credits = free_credits - 1, updated_at = ? WHERE id = ? AND free_credits > 0')
    .bind(new Date().toISOString(), userId).run();
  return free.meta.changes > 0 ? 'free' as const : null;
}

export async function refundCredit(userId: string, source: 'paid' | 'free') {
  const column = source === 'paid' ? 'paid_credits' : 'free_credits';
  const db = await getDb();
  await db.prepare(`UPDATE users SET ${column} = ${column} + 1, updated_at = ? WHERE id = ?`)
    .bind(new Date().toISOString(), userId).run();
}
