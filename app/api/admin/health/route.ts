import {BACKEND_VERSION} from '@/backend/version';
import {getCurrentUser} from '@/lib/auth';
import {proxyBackend} from '@/lib/backend-proxy';
import {latestSentryIssues} from '@/lib/monitoring/health';
export const dynamic='force-dynamic';

const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};

// Administrators only. The game backend performs the administrator check; the
// Sentry API is called only after it has answered 200 for this session.
export async function GET(request:Request) {
  const user=await getCurrentUser();
  if(!user)return Response.json({error:'Sign in to continue.'},{status:401,headers});
  const upstream=await proxyBackend(new Request(new URL('/api/game?action=health',request.url),{headers:{host:request.headers.get('host')||''}}),'game');
  if(upstream.status===401||upstream.status===403)return Response.json({error:'Administrator access is required.'},{status:403,headers});
  const live=upstream.headers.get('X-Hikmah-Backend-Version');
  // The release identifiers are public: one is in the published source, the other is a response header.
  const version={expected:BACKEND_VERSION,live,match:live===BACKEND_VERSION};
  // An older backend has no health resource and cannot confirm the administrator role.
  if(!upstream.ok)return Response.json({version,backend:null,backendStatus:upstream.status,sentry:null},{headers});
  let backend=null;
  try{backend=await upstream.json()}catch{}
  return Response.json({version,backend,backendStatus:200,sentry:await latestSentryIssues()},{headers});
}
