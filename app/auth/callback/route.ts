import {serverAuth} from '@/lib/supabase/server';
import {safeNext} from '@/lib/supabase/config';
import {noteAuthFailure} from '@/lib/monitoring/health';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const client = await serverAuth();
  if (code && client) {
    const {error} = await client.auth.exchangeCodeForSession(code);
    if (!error) return new Response(null, {status: 303, headers: {Location: safeNext(url.searchParams.get('next')), 'Cache-Control': 'no-store'}});
  }
  // A request without a code is a stray visit, not a failed sign-in.
  if (code) await noteAuthFailure('callback_failed',url.origin);
  return new Response(null, {status: 303, headers: {Location: '/login?error=callback', 'Cache-Control': 'no-store'}});
}
