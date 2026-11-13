import 'server-only';
import {siteIdentity} from './site-identity';

export async function proxyBackend(request: Request, resource: 'game' | 'avatar') {
  let stage='configuration';
  try {
    const url = new URL(request.url);
    if (request.method === 'POST') {
      const origin = request.headers.get('origin');
      // Next.js can construct request.url with its internal listener hostname.
      // The HTTP Host represents the public host used by the browser.
      if (origin) {
        let allowed = false;
        try {
          const source = new URL(origin);
          allowed = ['http:', 'https:'].includes(source.protocol)
            && source.host === (request.headers.get('host') || url.host);
        } catch {}
        if (!allowed) return Response.json({error: 'Request origin is not allowed.'}, {status: 403});
      }
    }
    const base = process.env.HIKMAH_PREVIEW_BACKEND_URL || process.env.HIKMAH_BACKEND_URL;
    const token = process.env.HIKMAH_BACKEND_TOKEN;
    if (!base || !token) throw new Error('The backend connection is not configured.');
    const target = new URL(base);
    target.search = url.search;
    target.searchParams.set('resource', resource);
    target.searchParams.set('method', request.method);
    const limit = resource === 'avatar' ? 5_300_000 : 40_000;
    if (Number(request.headers.get('content-length')) > limit) return Response.json({error: 'Request is too large.'}, {status: 413});
    const body = request.method === 'POST' ? await request.arrayBuffer() : undefined;
    if ((body?.byteLength || 0) > limit) return Response.json({error: 'Request is too large.'}, {status: 413});
    stage='identity';
    const actor = await siteIdentity();
    stage='upstream';
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'x-hikmah-server-token': token,
        // Keep SQL-heavy execution beside the project's Frankfurt database.
        // This removes the per-query transatlantic round trips from Netlify.
        'x-region': process.env.HIKMAH_BACKEND_REGION || 'eu-central-1',
        'x-hikmah-actor': encodeURIComponent(JSON.stringify(actor)),
        'content-type': request.headers.get('content-type') || 'application/json',
      },
      body,
      signal: AbortSignal.timeout(25_000),
    });
    const headers = new Headers({
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Cache-Control': resource === 'avatar' && request.method === 'GET' && response.ok ? 'private, max-age=86400' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    const version=response.headers.get('x-hikmah-backend-version');
    if(version)headers.set('X-Hikmah-Backend-Version',version);
    if(!response.ok)headers.set('X-Hikmah-Error-Stage','backend');
    return new Response(response.body, {status: response.status, headers});
  } catch(error) {
    // Stage and error class only: never log credentials, headers, player data or bodies.
    console.error('Hikmah proxy failure',{stage,errorClass:error instanceof Error?error.name:'unknown'});
    return Response.json({error: 'The game service is temporarily unavailable. Please try again.'}, {status: 503,headers:{'X-Hikmah-Error-Stage':stage,'X-Hikmah-Error-Type':error instanceof Error?error.name:'unknown'}});
  }
}
