import postgres from 'postgres';
import {AsyncLocalStorage} from 'node:async_hooks';
import {env} from 'node:process';
import {postgresQuery} from './postgres-query';

const context = new AsyncLocalStorage<postgres.TransactionSql>();
const effects = new AsyncLocalStorage<{commit: (() => Promise<void>)[]; rollback: (() => Promise<void>)[]}>();
const numeric = {to: 0, from: [20, 1700], serialize: (x: number) => String(x), parse: (x: string) => {
  const value = Number(x);
  if (!Number.isSafeInteger(value)) throw new Error('Database number is outside the supported range.');
  return value;
}};

// Runs in Supabase, never in the Sites Worker or browser.
let connection: ReturnType<typeof postgres> | undefined;
export function createConnection() {
  if (!env.SUPABASE_DB_URL) throw new Error('Database connection is not configured.');
  // Reuse a bounded pool in a warm function instead of reconnecting for every poll.
  return connection ??= postgres(env.SUPABASE_DB_URL, {prepare: false, max: 2, idle_timeout: 20, connect_timeout: 10, max_lifetime: 300, types: {numeric}});
}

export async function withDatabase<T>(sql: ReturnType<typeof createConnection>, work: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const pending = {commit: [] as (() => Promise<void>)[], rollback: [] as (() => Promise<void>)[]};
    try {
      const result = await sql.begin('isolation level serializable', async tx => {
        await tx.unsafe('SET LOCAL ROLE hikmah_server');
        await tx.unsafe('SET LOCAL search_path = hikmah, pg_catalog');
        await tx.unsafe("SET LOCAL statement_timeout = '10s'");
        return effects.run(pending, () => context.run(tx, work));
      }) as T;
      // File deletions must not happen before the profile update commits.
      // Cleanup failures cannot roll back an already committed game operation.
      for (const cleanup of pending.commit) {
        try { await cleanup(); } catch { console.error('Avatar cleanup needs retry.'); }
      }
      return result;
    } catch (error: any) {
      for (const cleanup of pending.rollback) {
        try { await cleanup(); } catch { console.error('Uncommitted avatar cleanup needs retry.'); }
      }
      if (!['40001', '40P01'].includes(error?.code) || attempt >= 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 25 * 2 ** attempt + Math.floor(Math.random() * 25)));
    }
  }
}

class Statement {
  constructor(private query: string, private args: any[] = []) {}
  bind(...args: any[]) { return new Statement(this.query, args); }
  async all<T = any>() {
    const tx = context.getStore();
    if (!tx) throw new Error('A game transaction is required.');
    const rows = await tx.unsafe(postgresQuery(this.query), this.args);
    return {results: Array.from(rows) as T[], meta: {changes: rows.count}};
  }
  async first<T = any>() { return (await this.all<T>()).results[0] || null; }
  async run() { return this.all(); }
}
export function database() {
  return {
    prepare: (query: string) => new Statement(query),
    batch: async (statements: Statement[]) => {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    },
  };
}

// Avatar bytes live in Supabase Storage. Browser URLs stay host-relative.
export function bucket() {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Avatar storage is unavailable.');
  const headers = {Authorization: 'Bearer ' + key, apikey: key};
  const url = (path: string) => base + '/storage/v1/object/hikmah-avatars/' + path;
  const remove = async (path: string) => {
    const response = await fetch(base + '/storage/v1/object/hikmah-avatars', {method: 'DELETE', headers: {...headers, 'Content-Type': 'application/json'}, body: JSON.stringify({prefixes: [path]}), signal: AbortSignal.timeout(10_000)});
    if (!response.ok && response.status !== 404) throw new Error('Avatar deletion failed.');
  };
  const queue = (path:string) => database().prepare('INSERT OR IGNORE INTO storage_deletion_jobs(path,requested_at) VALUES(?,?)').bind(path,Date.now()).run();
  return {
    async get(path: string) {
      const response = await fetch(url(path), {headers,signal:AbortSignal.timeout(10_000)});
      if (response.status === 404 || response.status === 400) return null;
      if (!response.ok) throw new Error('Avatar download failed.');
      return {body: response.body, httpMetadata: {contentType: response.headers.get('content-type') || 'image/png'}};
    },
    async put(path: string, bytes: Uint8Array, options: {httpMetadata: {contentType: string}}) {
      const response = await fetch(url(path), {method: 'POST', headers: {...headers, 'Content-Type': options.httpMetadata.contentType}, body: bytes as BodyInit,signal:AbortSignal.timeout(10_000)});
      if (!response.ok) throw new Error('Avatar upload failed.');
      effects.getStore()?.rollback.push(async () => {
        try{await remove(path)}catch(error){await withDatabase(createConnection(),()=>queue(path));throw error}
      });
    },
    async delete(path: string) {
      const pending = effects.getStore();
      if (pending) {
        await queue(path);
        pending.commit.push(async()=>{
          await remove(path);
          await withDatabase(createConnection(),()=>database().prepare('DELETE FROM storage_deletion_jobs WHERE path=?').bind(path).run());
        });
      }
      else await remove(path);
    },
  };
}
