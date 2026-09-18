import {env} from 'node:process';
import {createConnection, withDatabase} from '../db/raw';
import {actorContext, type Actor} from '../lib/game/actor';
import {NextRequest} from './http';
import * as game from './game-route';
import * as avatar from './avatar-route';

function validActor(value: any): value is Actor {
  return value && typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 200 &&
    typeof value.name === 'string' && value.name.length <= 200 && typeof value.signed === 'boolean' &&
    (value.signed ? !value.id.startsWith('g_') : /^g_[a-f0-9-]{36}$/.test(value.id)) &&
    (value.authUserId === undefined || (value.signed && typeof value.authUserId === 'string' &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.authUserId) && value.id === 'sb_' + value.authUserId));
}

export async function handleBackend(request: Request): Promise<Response> {
  if (request.method !== 'POST') return Response.json({error: 'Method not allowed.'}, {status: 405});
  const token = request.headers.get('x-hikmah-server-token');
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return Response.json({error: 'Unauthorized.'}, {status: 401});
  const sql = createConnection();
  try {
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2, '0')).join('');
    // This hash is provisioned privately, never embedded in published source.
    const accepted = await sql`SELECT 1 FROM hikmah.server_credentials WHERE token_hash = ${hash} AND revoked_at IS NULL`;
    if (!accepted.length) return Response.json({error: 'Unauthorized.'}, {status: 401});
    const actorHeader = request.headers.get('x-hikmah-actor');
    let actor: Actor;
    try { actor = JSON.parse(decodeURIComponent(actorHeader || '')); }
    catch { return Response.json({error: 'Invalid identity.'}, {status: 400}); }
    if (!validActor(actor)) return Response.json({error: 'Invalid identity.'}, {status: 400});
    if (actor.authUserId) {
      // Explicit links preserve legacy wallets. Never link by display name.
      const linked = await sql`SELECT id FROM hikmah.profiles WHERE auth_user_id = ${actor.authUserId}`;
      if (linked.length) actor.id = linked[0].id;
    }
    const url = new URL(request.url);
    const resource = url.searchParams.get('resource');
    const method = url.searchParams.get('method');
    if (!['game', 'avatar'].includes(resource || '') || !['GET', 'POST'].includes(method || '')) return Response.json({error: 'Unknown request.'}, {status: 404});
    url.searchParams.delete('resource'); url.searchParams.delete('method');
    const body = method === 'POST' ? await request.arrayBuffer() : undefined;
    const limit = resource === 'avatar' ? 5_300_000 : 40_000;
    if ((body?.byteLength || 0) > limit) return Response.json({error: 'Request is too large.'}, {status: 413});
    const handler = (resource === 'game' ? game : avatar)[method as 'GET' | 'POST'];
    return await actorContext.run(actor, () => withDatabase(sql, () => {
      const headers = new Headers();
      if (body) {
        headers.set('content-type', request.headers.get('content-type') || 'application/json');
        headers.set('content-length', String(body.byteLength));
      }
      return handler(new NextRequest(url, {method: method!, headers, body}));
    }));
  } catch (error: any) {
    // Do not log parameter values, tokens, or player answers.
    console.error('Hikmah backend failure', {code: error?.code || 'backend_error', message: error?.message});
    return Response.json({error: 'The game service is unavailable. Your last saved progress is safe. Try again.'}, {status: 503});
  } finally {
    await sql.end({timeout: 1});
  }
}

// esbuild leaves this runtime entrypoint available to Supabase Edge Functions.
declare const Deno: {serve: (handler: (request: Request) => Promise<Response>) => void};
if (typeof Deno !== 'undefined' && env.SUPABASE_URL) Deno.serve(handleBackend);
