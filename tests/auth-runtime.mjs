import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const uuid = '11111111-1111-4111-8111-111111111111';
const user = {id:uuid, aud:'authenticated', role:'authenticated', email:'test@example.invalid', email_confirmed_at:'2026-01-01T00:00:00Z', is_anonymous:false, app_metadata:{provider:'email'}, user_metadata:{full_name:'Player', userId:'forged-admin', role:'admin'}, created_at:'2026-01-01T00:00:00Z'};
const expires = Math.floor(Date.now()/1000)+3600;
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = encode({alg:'HS256',typ:'JWT'}) + '.' + encode({sub:uuid, aud:'authenticated', role:'authenticated', exp:expires, iat:expires-3600}) + '.local-signature';
const session = {access_token:token, refresh_token:'local-refresh', expires_at:expires, expires_in:3600, token_type:'bearer', user};
const cookie = 'sb-127-auth-token=base64-' + encode(session);
let allowed = true;
const mock = createServer(async (request,response) => {
  response.setHeader('Content-Type','application/json');
  if(request.url.startsWith('/auth/v1/user')) {
    if(!allowed || request.headers.authorization !== 'Bearer '+token) {response.statusCode=401;response.end(JSON.stringify({message:'Invalid token'}));return;}
    response.end(JSON.stringify(user));return;
  }
  if(request.url.startsWith('/auth/v1/settings')) {response.end(JSON.stringify({external:{google:true,email:true}}));return;}
  if(request.url.startsWith('/auth/v1/logout')) {response.end('{}');return;}
  if(request.url.startsWith('/auth/v1/token')) {
    let body='';for await(const chunk of request)body+=chunk;
    if(JSON.parse(body).auth_code !== 'valid-code') {response.statusCode=400;response.end(JSON.stringify({message:'Bad code'}));return;}
    response.end(JSON.stringify(session));return;
  }
  if(request.url.startsWith('/backend')) {
    response.end(JSON.stringify({actor:JSON.parse(decodeURIComponent(request.headers['x-hikmah-actor']))}));return;
  }
  response.statusCode=404;response.end('{}');
});
mock.listen(0,'127.0.0.1');await once(mock,'listening');
const reserve=createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');const port=reserve.address().port;await new Promise(r=>reserve.close(r));
const origin='http://127.0.0.1:'+port;
const upstream='http://127.0.0.1:'+mock.address().port;
let output='';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:upstream,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-key',HIKMAH_BACKEND_URL:upstream+'/backend',HIKMAH_BACKEND_TOKEN:'test-token'},stdio:['ignore','pipe','pipe']});
child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>output+=v);
try {
  let ready=false;
  for(let i=0;i<100;i++) {if(child.exitCode!==null)throw new Error(output);try{ready=(await fetch(origin+'/login')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100));}
  assert(ready,output);
  const headers={Cookie:cookie};
  const verified=await fetch(origin+'/api/game?action=dashboard',{headers});
  assert.equal(verified.status,200);
  const data=await verified.json();
  assert.equal(data.actor.signed,true);
  assert.equal(data.actor.id,'sb_'+uuid);
  assert.equal(data.actor.authUserId,uuid);
  assert(!JSON.stringify(data).includes('forged-admin'));
  assert.match(verified.headers.get('cache-control'),/no-store/);
  assert.equal((await fetch(origin+'/reset-password',{headers})).status,200);
  allowed=false;
  const revoked=await fetch(origin+'/api/game?action=dashboard',{headers});
  assert.equal((await revoked.json()).actor.signed,false,'revoked identity must become guest');
  allowed=true;
  const pkce='sb-127-auth-token-code-verifier=base64-'+encode('test-verifier');
  for(const unsafe of ['https://evil.invalid','//evil.invalid','/\\evil.invalid']) {
    const callback=await fetch(origin+'/auth/callback?code=valid-code&next='+encodeURIComponent(unsafe),{headers:{Cookie:pkce},redirect:'manual'});
    assert.equal(callback.status,303);assert.equal(callback.headers.get('location'),'/');
    assert(callback.headers.get('set-cookie')?.includes('sb-127-auth-token'));
  }
  const missing=await fetch(origin+'/auth/callback?next=/admin',{redirect:'manual'});
  assert.equal(missing.headers.get('location'),'/login?error=callback');
  const blocked=await fetch(origin+'/auth/signout',{method:'POST',headers:{...headers,Origin:'https://evil.invalid'},redirect:'manual'});
  assert.equal(blocked.status,403);
  const logout=await fetch(origin+'/auth/signout',{method:'POST',headers:{...headers,Origin:origin},redirect:'manual'});
  assert.equal(logout.status,303);assert.equal(logout.headers.get('location'),'/');
  assert(logout.headers.get('set-cookie')?.includes('Max-Age=0'));
  console.log('Passed: verified account, metadata isolation, revoked session rejection, password reset guard, PKCE callback, redirect isolation, logout and CSRF protection.');
} finally {
  if(child.exitCode===null){const exited=once(child,'exit');child.kill('SIGTERM');await exited;}
  mock.closeAllConnections();await new Promise(r=>mock.close(r));
}
