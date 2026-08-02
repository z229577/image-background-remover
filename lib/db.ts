import { getCloudflareContext } from '@opennextjs/cloudflare';

export type D1Result = { meta: { changes: number } };
export type PreparedStatement = {
  bind(...values: unknown[]): PreparedStatement;
  run(): Promise<D1Result>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
};
export type AppDb = {
  prepare(query: string): PreparedStatement;
  batch(statements: PreparedStatement[]): Promise<unknown>;
};

export async function getDb(): Promise<AppDb> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { DB?: AppDb }).DB;
  if (!db) throw new Error('D1 database binding DB is not configured.');
  return db;
}
