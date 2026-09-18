import {serverAuth} from '@/lib/supabase/server';
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host') || new URL(request.url).host;
  try {
    if (!origin || new URL(origin).host !== host) return new Response('Forbidden', {status: 403});
  } catch { return new Response('Forbidden', {status: 403}); }
  const client = await serverAuth();
  if (client) {
    const {error} = await client.auth.signOut({scope: 'local'});
    if (error) return Response.json({error: 'Sign-out failed. Please retry.'}, {status: 503});
  }
  return new Response(null, {status: 303, headers: {Location: '/', 'Cache-Control': 'no-store'}});
}
