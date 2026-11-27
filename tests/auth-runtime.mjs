import {solveChallenge} from 'altcha-lib';
import {deriveKey} from 'altcha-lib/algorithms/pbkdf2';
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
let deletedAccount=false;
let emailVerifications=0;
let signups=0;
const attestations=[],healthEvents=[];
const automaticHash='c'.repeat(64);
const mismatchedHash='d'.repeat(64);
const consumedEmailTokens=new Set();
const prefixedEmailToken='pkce_'+'b'.repeat(56);
const mock = createServer(async (request,response) => {
  response.setHeader('Content-Type','application/json');
  if(request.url.startsWith('/auth/v1/user')) {
    if(!allowed || request.headers.authorization !== 'Bearer '+token) {response.statusCode=401;response.end(JSON.stringify({message:'Invalid token'}));return;}
    response.end(JSON.stringify(user));return;
  }
  if(request.url.startsWith('/auth/v1/settings')) {response.end(JSON.stringify({external:{google:true,email:true}}));return;}
  if(request.url.startsWith('/auth/v1/signup')) {
    signups++;
    let body='';for await(const chunk of request)body+=chunk;
    const input=JSON.parse(body);
    assert.deepEqual(input.data,{full_name:'Player',hikmah_signup_ticket:uuid});
    response.end(JSON.stringify({...user,email:input.email,email_confirmed_at:null,identities:input.email.startsWith('existing')?[]:[{id:uuid,provider:'email'}]}));return;
  }
  if(request.url==='/auth/v1/verify') {
    emailVerifications++;
    let body='';for await(const chunk of request)body+=chunk;
    const input=JSON.parse(body),key=input.type+':'+input.token_hash;
    if(!['a'.repeat(64),prefixedEmailToken,automaticHash,mismatchedHash].includes(input.token_hash)||consumedEmailTokens.has(key)){response.statusCode=400;response.end('{"message":"Invalid or expired token"}');return;}
    consumedEmailTokens.add(key);response.end(JSON.stringify(session));return;
  }
  if(request.url.startsWith('/auth/v1/logout')) {response.statusCode=deletedAccount?404:200;response.end(deletedAccount?'{"message":"User not found"}':'{}');return;}
  if(request.url.startsWith('/auth/v1/token')) {
    let body='';for await(const chunk of request)body+=chunk;
    if(JSON.parse(body).auth_code !== 'valid-code') {response.statusCode=400;response.end(JSON.stringify({message:'Bad code'}));return;}
    response.end(JSON.stringify(session));return;
  }
  if(request.url.startsWith('/backend')) {
    if(new URL(request.url,'http://localhost').searchParams.get('resource')==='signup-guard'){
      assert.match(request.headers['x-hikmah-proof'],/^[0-9a-f]{64}$/);
      assert.match(request.headers['x-hikmah-client'],/^[0-9a-f]{64}$/);
      response.end(JSON.stringify({ticket:uuid}));return;
    }
    if(new URL(request.url,'http://localhost').searchParams.get('resource')==='health-event'){
      // Handled sign-in failures are counted by fixed reason only: no actor, address or account data.
      assert(!request.headers['x-hikmah-actor']);
      let body='';for await(const chunk of request)body+=chunk;
      const event=JSON.parse(body);assert.deepEqual(Object.keys(event),['reason']);
      assert(['signup_rejected','callback_failed','confirm_failed'].includes(event.reason));
      healthEvents.push(event.reason);response.end('{"ok":true}');return;
    }
    if(new URL(request.url,'http://localhost').searchParams.get('resource')==='signup-consent'){
      assert(!request.headers['x-hikmah-actor']);
      assert.equal(request.headers['x-hikmah-server-token'],'a'.repeat(64));
      let body='';for await(const chunk of request)body+=chunk;
      attestations.push(JSON.parse(body));response.end('{"ok":true}');return;
    }
    response.end(JSON.stringify({actor:JSON.parse(decodeURIComponent(request.headers['x-hikmah-actor']))}));return;
  }
  response.statusCode=404;response.end('{}');
});
mock.listen(0,'127.0.0.1');await once(mock,'listening');
const reserve=createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');const port=reserve.address().port;await new Promise(r=>reserve.close(r));
const origin='http://127.0.0.1:'+port;
const upstream='http://127.0.0.1:'+mock.address().port;
let output='';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:upstream,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-key',HIKMAH_BACKEND_URL:upstream+'/backend',HIKMAH_BACKEND_TOKEN:'a'.repeat(64)},stdio:['ignore','pipe','pipe']});
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
  const emailToken='a'.repeat(64),verificationUrl=origin+'/auth/confirm/verify';
  const confirmPage=await fetch(origin+'/auth/confirm?type=email&token_hash='+emailToken);
  assert.equal(confirmPage.status,200);assert.match(confirmPage.headers.get('cache-control'),/no-store/);
  const confirmationHtml=await confirmPage.text();
  assert.match(confirmationHtml,/<meta name="referrer" content="strict-origin"\/?\s*>/,'native POST must retain Origin while omitting the token-bearing referrer path/query');
  assert(confirmationHtml.includes('/auth/confirm/verify'));
  const prefixedPage=await fetch(origin+'/auth/confirm?type=email&token_hash='+prefixedEmailToken);
  const prefixedHtml=await prefixedPage.text();
  assert.equal(prefixedPage.status,200);
  assert(prefixedHtml.includes('action="/auth/confirm/verify"')&&prefixedHtml.includes('value="'+prefixedEmailToken+'"'),'a real-shaped PKCE hash must reach the confirmation form unchanged');
  assert.equal(emailVerifications,0,'opening or scanning the landing page must not consume the token');
  const form=(type,hash=emailToken)=>new URLSearchParams({token_hash:hash,type,next:'https://evil.invalid'});
  for(const candidate of ['https://evil.invalid','null',undefined]){
    const foreignConfirm=await fetch(verificationUrl,{method:'POST',headers:candidate?{Origin:candidate}:{},body:form('email'),redirect:'manual'});
    assert.equal(foreignConfirm.status,403);assert.equal(emailVerifications,0,'foreign, opaque and missing origins must not reach verification');
  }
  const invalidType=await fetch(verificationUrl,{method:'POST',headers:{Origin:origin},body:form('invite'),redirect:'manual'});
  assert.equal(invalidType.headers.get('location'),'/login?error=callback');assert.equal(emailVerifications,0);
  for(const hash of ['pkce_','a'.repeat(257),'a'.repeat(32)+'/','a'.repeat(31)]){
    const invalidHash=await fetch(verificationUrl,{method:'POST',headers:{Origin:origin},body:form('email',hash),redirect:'manual'});
    assert.equal(invalidHash.headers.get('location'),'/login?error=callback');
  }
  assert.equal(emailVerifications,0,'malformed hashes must not reach authentication');
  assert.equal((await fetch(verificationUrl,{method:'POST',headers:{Origin:origin},body:new URLSearchParams({token_hash:'a'.repeat(5000),type:'email'}),redirect:'manual'})).status,413);
  for(const hash of [emailToken,prefixedEmailToken])for(const [type,destination] of [['email','/'],['recovery','/reset-password']]) {
    // No cookies / PKCE verifier: the recipient may use a different browser.
    const verifiedEmail=await fetch(verificationUrl,{method:'POST',headers:{Origin:origin},body:form(type,hash),redirect:'manual'});
    assert.equal(verifiedEmail.status,303);assert.equal(verifiedEmail.headers.get('location'),destination);
    assert(verifiedEmail.headers.get('set-cookie')?.includes('sb-127-auth-token'));
    assert.equal(verifiedEmail.headers.get('referrer-policy'),'no-referrer');
  }
  const signupUrl=origin+'/auth/signup';
  const consent={version:'2026-11-13',capacity:'guardian',relationship:'legal_guardian',accepted:true,legalCapacity:true,childDataConsent:true};
  const signupBody={name:'Player',email:'test@example.invalid',password:'test-password-only',consent};
  const signup=(body,source=origin)=>fetch(signupUrl,{method:'POST',headers:{Origin:source,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await signup(signupBody,'https://evil.invalid')).status,403);
  assert.equal((await signup({...signupBody,consent:{...consent,childDataConsent:false}})).status,400);
  assert.equal(signups,0,'invalid requests must not create Auth users');
  assert.equal((await signup(signupBody)).status,400,'unverified signup is rejected');
  assert.equal(signups,0);
  async function proof(){
    const challenge=await (await fetch(origin+'/auth/challenge')).json();
    const solution=await solveChallenge({challenge,deriveKey});
    return Buffer.from(JSON.stringify({challenge,solution})).toString('base64');
  }
  const invite='/multiplayer?code=QA-INVITE';
  const created=await signup({...signupBody,next:invite,altcha:await proof()});
  assert.equal(created.status,200);
  assert.deepEqual(await created.json(),{signedIn:false});
  assert.deepEqual(attestations,[{authUserId:uuid,consent}]);
  const marker=created.headers.getSetCookie().find(value=>value.startsWith('__Host-hikmah_signup='));
  assert.match(marker,/HttpOnly/i);
  assert.match(marker,/Secure/i);
  const pendingCookie=marker.split(';')[0];
  const duplicate=await signup({...signupBody,altcha:await proof(),email:'existing@example.invalid'});
  assert.deepEqual(await duplicate.json(),{signedIn:false});
  assert.equal(attestations.length,1,'an obfuscated duplicate must not record consent');
  assert(!duplicate.headers.getSetCookie().some(value=>value.startsWith('__Host-hikmah_signup=')));
  const landing=origin+'/auth/confirm?type=email&token_hash='+automaticHash;
  const checksBeforeAuto=emailVerifications;
  for(const headers of [{Cookie:pendingCookie},{'Sec-Fetch-User':'?1'}]){
    const response=await fetch(landing,{headers});
    assert(!(await response.text()).includes('name="automatic"'),'auto-submit requires a browser marker and user gesture');
  }
  const sameBrowser=await fetch(landing,{headers:{Cookie:pendingCookie,'Sec-Fetch-User':'?1'}});
  assert((await sameBrowser.text()).includes('name="automatic"'));
  assert.equal(emailVerifications,checksBeforeAuto,'a landing GET never consumes an email token');
  const auto=(hash,marker)=>fetch(verificationUrl,{method:'POST',headers:{Origin:origin,...(marker&&{Cookie:marker})},body:new URLSearchParams({type:'email',token_hash:hash,automatic:'1'}),redirect:'manual'});
  const wrongBrowser=await auto(automaticHash);
  assert.equal(wrongBrowser.headers.get('location'),'/login?error=callback');
  assert.equal(emailVerifications,checksBeforeAuto);
  const wrongAccount=await auto(mismatchedHash,pendingCookie.replace(uuid,'22222222-2222-4222-8222-222222222222'));
  assert.equal(wrongAccount.headers.get('location'),'/login?error=callback');
  assert(!wrongAccount.headers.getSetCookie().some(value=>value.startsWith('sb-127-auth-token=')));
  const automatic=await auto(automaticHash,pendingCookie);
  assert.equal(automatic.headers.get('location'),invite);
  assert(automatic.headers.getSetCookie().some(value=>value.startsWith('sb-127-auth-token=')));
  const verifiedDashboard=await fetch(origin+'/api/game?action=dashboard',{headers:{Cookie:automatic.headers.getSetCookie().find(value=>value.startsWith('sb-127-auth-token=')).split(';')[0]}});
  assert.equal((await verifiedDashboard.json()).actor.authUserId,uuid);
  const reused=await fetch(verificationUrl,{method:'POST',headers:{Origin:origin},body:form('email'),redirect:'manual'});
  assert.equal(reused.headers.get('location'),'/login?error=callback','used tokens cannot sign in twice');
  const invalidUpstream=await fetch(verificationUrl,{method:'POST',headers:{Origin:origin},body:form('email','z'.repeat(64)),redirect:'manual'});
  assert.equal(invalidUpstream.headers.get('location'),'/login?error=callback','only Supabase can authenticate a token that passes the shape check');
  const blocked=await fetch(origin+'/auth/signout',{method:'POST',headers:{...headers,Origin:'https://evil.invalid'},redirect:'manual'});
  assert.equal(blocked.status,403);
  const logout=await fetch(origin+'/auth/signout',{method:'POST',headers:{...headers,Origin:origin},redirect:'manual'});
  assert.equal(logout.status,303);assert.equal(logout.headers.get('location'),'/');
  function assertSessionCleared(response){
    const authCookies=response.headers.getSetCookie().filter(value=>/^sb-127-auth-token(?:\.\d+)?=/.test(value));
    assert(authCookies.length>0,'sign-out must clear the session cookie');
    for(const value of authCookies){
      assert.match(value,/^sb-127-auth-token(?:\.\d+)?=;/,'session value must be empty');
      const maxAge=value.match(/Max-Age=(-?\d+)/i),expires=value.match(/Expires=([^;]+)/i);
      assert((maxAge&&Number(maxAge[1])<=0)||(expires&&Date.parse(expires[1])<Date.now()),'session cookie must expire immediately');
    }
  }
  assertSessionCleared(logout);
  deletedAccount=true;
  const erasedLogout=await fetch(origin+'/auth/signout',{method:'POST',headers:{...headers,Origin:origin},redirect:'manual'});
  assert.equal(erasedLogout.status,303);assertSessionCleared(erasedLogout);
  assert(healthEvents.includes('confirm_failed'),'handled confirmation failures are counted');assert(!healthEvents.includes('callback_failed'),'a callback without a code is not a sign-in failure');
  console.log('Passed: verified account, metadata isolation, revoked session rejection, password reset guard, PKCE callback, verified signup consent, browser-bound confirmation, duplicate signup, redirect isolation, logout and CSRF protection.');
} finally {
  if(child.exitCode===null){const exited=once(child,'exit');child.kill('SIGTERM');await exited;}
  mock.closeAllConnections();await new Promise(r=>mock.close(r));
}
