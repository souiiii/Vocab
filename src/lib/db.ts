import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
export type Query = <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
type Connection = {
  query: Query;
  transaction: <T>(fn: (query: Query) => Promise<T>) => Promise<T>;
};
declare global {
  var marginConnection: Promise<Connection> | undefined;
}
export const databaseMode = () => (process.env.DATABASE_URL ? 'neon' : 'local');
async function connect(): Promise<Connection> {
  let connection: Connection;
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 10000,
    });
    connection = {
      query: async <T>(sql: string, params?: unknown[]) =>
        (await pool.query(sql, params)).rows as T[],
      transaction: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn(
            async <T>(sql: string, params?: unknown[]) =>
              (await client.query(sql, params)).rows as T[],
          );
          await client.query('COMMIT');
          return result;
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      },
    };
  } else {
    const dir = process.env.LOCAL_DATA_DIR || '.local/postgres';
    if (!dir.startsWith('memory://'))
      await mkdir(path.resolve(dir), { recursive: true, mode: 0o700 });
    const pg = new PGlite(dir);
    // Serialize ordinary statements with transactions: PGlite has one connection.
    let queue = Promise.resolve();
    const serial = <T>(fn: () => Promise<T>) => {
      const next = queue.then(fn);
      queue = next.then(
        () => {},
        () => {},
      );
      return next;
    };
    connection = {
      query: <T>(sql: string, params?: unknown[]) =>
        serial(async () => (await pg.query<T>(sql, params)).rows),
      transaction: (fn) =>
        serial(() =>
          pg.transaction((tx) =>
            fn(async <T>(sql: string, params?: unknown[]) => (await tx.query<T>(sql, params)).rows),
          ),
        ),
    };
  }
  await connection.query(
    'CREATE TABLE IF NOT EXISTS margin_migrations (name text PRIMARY KEY, applied_at text NOT NULL)',
  );
  for (const name of (await readdir(path.join(process.cwd(), 'drizzle')))
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    if ((await connection.query('SELECT name FROM margin_migrations WHERE name=$1', [name])).length)
      continue;
    const sql = await readFile(path.join(process.cwd(), 'drizzle', name), 'utf8');
    await connection.transaction(async (q) => {
      for (const statement of sql.split('--> statement-breakpoint'))
        if (statement.trim()) await q(statement);
      await q('INSERT INTO margin_migrations VALUES ($1,$2)', [name, new Date().toISOString()]);
    });
  }
  return connection;
}
export async function db() {
  globalThis.marginConnection ??= connect().catch((e) => {
    globalThis.marginConnection = undefined;
    throw e;
  });
  return globalThis.marginConnection;
}
export async function insert(
  q: Query,
  table: string,
  row: Record<string, unknown>,
  conflict = false,
) {
  const keys = Object.keys(row);
  await q(
    'INSERT INTO "' +
      table +
      '" (' +
      keys.map((k) => '"' + k + '"').join(',') +
      ') VALUES (' +
      keys.map((_, i) => '$' + (i + 1)).join(',') +
      ')' +
      (conflict ? ' ON CONFLICT DO NOTHING' : ''),
    keys.map((k) =>
      typeof row[k] === 'object' && row[k] !== null ? JSON.stringify(row[k]) : row[k],
    ),
  );
}
