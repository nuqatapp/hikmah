import {serverAuth} from '@/lib/supabase/server';
import {cookies} from 'next/headers';
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host') || new URL(request.url).host;
  try {
    if (!origin || new URL(origin).host !== host) return new Response('Forbidden', {status: 403});
  } catch { return new Response('Forbidden', {status: 403}); }
  const client = await serverAuth();
  if (client) {
    const {error} = await client.auth.signOut({scope: 'local'});
    if (error && ![401,403,404].includes(error.status||0)) return Response.json({error: 'Sign-out failed. Please retry.'}, {status: 503});
  }
  // An already-erased Auth account can no longer log out upstream; clear its local session.
  const jar=await cookies();
  for(const cookie of jar.getAll())if(/^sb-.*auth-token(?:\.\d+)?$/.test(cookie.name))jar.delete(cookie.name);
  return new Response(null, {status: 303, headers: {Location: '/', 'Cache-Control': 'no-store'}});
}
