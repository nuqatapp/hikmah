import {contentSecurityPolicy} from '@/lib/content-security';
import {createServerClient} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';
import {authConfig} from '@/lib/supabase/config';
export async function proxy(request: NextRequest) {
  const forwarded=new Headers(request.headers);
  const nonce=crypto.randomUUID().replaceAll('-','');
  const policy=contentSecurityPolicy(nonce);
  forwarded.set('Content-Security-Policy',policy);
  const language=request.nextUrl.searchParams.get('lang');
  forwarded.set('x-hikmah-language', language==='ar'||language==='en'?language:'');
  forwarded.set('x-hikmah-path',request.nextUrl.pathname);
  let response=NextResponse.next({request:{headers:forwarded}});
  const config = authConfig();
  if (config) {
    const client = createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          for (const {name, value} of values) request.cookies.set(name, value);
          forwarded.set('cookie', request.cookies.toString());
          response=NextResponse.next({request:{headers:forwarded}});
          for (const {name, value, options} of values) response.cookies.set(name, value, options);
        },
      },
    });
    await client.auth.getClaims();
  }
  response.headers.set('Content-Security-Policy',policy);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = {matcher: ['/((?!_next/static|_next/image|assets/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2|txt|html)$).*)']};
