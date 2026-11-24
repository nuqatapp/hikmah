export function contentSecurityPolicy(nonce?:string){
  const dev=process.env.NODE_ENV==='development';
  const auth=process.env.NEXT_PUBLIC_SUPABASE_URL;
  let authOrigin='';
  try{if(auth)authOrigin=new URL(auth).origin}catch{}
  return [
    "default-src 'self'",
    "script-src 'self'"+(nonce?" 'nonce-"+nonce+"'":"")+(dev?" 'unsafe-eval'":""),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'"+(authOrigin?' '+authOrigin:'')+(dev?' ws: wss:':''),
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ');
}
