import assert from 'node:assert/strict';
import {scrubEvent,scrubText,scrubUrl,scrubBreadcrumb} from '../lib/monitoring/scrub.mjs';
import {createReporter,parseDsn} from '../lib/monitoring/reporter.mjs';

const email='player.one+test@example.com',token='a'.repeat(64),jwt='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
const guest='g_00000000-0000-4000-8000-000000000001',auth='sb_11111111-2222-4333-8444-555555555555',nickname='Layla Unique Nickname';
const secrets=[email,token,jwt,guest,auth.slice(3),nickname,'hikmah_guest','code=abc123','pkce_'+'b'.repeat(40)];

// Free text.
const text=scrubText(`Failed for ${email} with Bearer ${jwt} token ${token} actor ${auth} at https://hikmahgame.com/auth/callback?code=abc123&next=/play`);
for(const secret of [email,token,jwt,auth.slice(3),'code=abc123'])assert(!text.includes(secret),'free text keeps '+secret);
assert.equal(scrubText('Unexpected token ? in JSON'),'Unexpected token ? in JSON');
assert.equal(scrubUrl('https://hikmahgame.com/play?id=room-1#top'),'https://hikmahgame.com/play');
assert.equal(scrubUrl('/auth/confirm?token_hash=pkce_abc&type=email'),'/auth/confirm');

// Breadcrumbs: console and DOM trails are dropped; fetch URLs lose their query.
assert.equal(scrubBreadcrumb({category:'console',message:nickname}),null);
assert.equal(scrubBreadcrumb({category:'ui.click',message:'button[aria-label="'+nickname+'"]'}),null);
assert.deepEqual(scrubBreadcrumb({category:'fetch',type:'http',data:{url:'/api/game?action=room&id=abc',method:'GET',status_code:503,request_body:nickname}}).data,{method:'GET',status_code:503,url:'/api/game'});

// A worst-case event as an SDK could assemble it.
const event=scrubEvent({
  user:{id:auth,email,username:nickname,ip_address:'203.0.113.9'},
  extra:{profile:{name:nickname,email}},
  server_name:'host-1',
  request:{url:'https://hikmahgame.com/api/game?action=export&id='+guest,method:'GET',query_string:'action=export',cookies:{hikmah_guest:guest},headers:{cookie:'hikmah_guest='+guest,authorization:'Bearer '+jwt,'x-hikmah-server-token':token},data:{email,name:nickname}},
  contexts:{browser:{name:'Chrome'},state:{profile:{name:nickname}},trace:{trace_id:'1'}},
  message:'Login failed for '+email,
  transaction:'/play?id=abc123',
  exception:{values:[{type:'Error',value:'duplicate key for '+email+' '+auth,mechanism:{type:'generic',data:{name:nickname}},stacktrace:{frames:[{filename:'https://hikmahgame.com/_next/app.js?code=abc123',vars:{name:nickname,password:'x'}}]}}]},
  breadcrumbs:[{category:'console',message:nickname},{category:'ui.input',message:nickname},{category:'navigation',data:{from:'/login?email='+email,to:'/play?id=abc123'}}],
  tags:{surface:'browser',backend_version:'2026-11-24-monitoring',leak:email},
});
const sent=JSON.stringify(event);
for(const secret of secrets)assert(!sent.includes(secret),'event keeps '+secret);
assert(!sent.includes('203.0.113.9')&&!('user' in event)&&!('extra' in event));
assert.deepEqual(event.request,{url:'https://hikmahgame.com/api/game',method:'GET'});
assert.deepEqual(Object.keys(event.contexts),['browser','trace']);
assert.equal(event.tags.backend_version,'2026-11-24-monitoring');
assert.equal(event.breadcrumbs.length,1);

// Region guard: only an EU (Germany) ingest DSN enables reporting.
const key='0123456789abcdef0123456789abcdef';
assert.equal(parseDsn('https://'+key+'@o123.ingest.us.sentry.io/456'),null);
assert.equal(parseDsn('https://'+key+'@o123.ingest.sentry.io/456'),null);
assert.equal(parseDsn('https://'+key+'@o123.ingest.de.sentry.io.evil.example/456'),null);
assert.equal(parseDsn('http://'+key+'@o123.ingest.de.sentry.io/456'),null);
assert.equal(parseDsn(''),null);assert.equal(parseDsn(undefined),null);
const dsn='https://'+key+'@o123.ingest.de.sentry.io/456';
assert.equal(parseDsn(dsn).endpoint,'https://o123.ingest.de.sentry.io/api/456/envelope/');

// Reporter: disabled without a DSN, never throws, sends one scrubbed envelope.
let calls=[];
const fake=async(url,options)=>{calls.push({url,options});return new Response('{}',{status:200})};
assert.equal(await createReporter({dsn:'',surface:'edge-function',fetch:fake}).report(new Error('x')),false);
assert.equal(calls.length,0);
const reporter=createReporter({dsn,surface:'edge-function',release:'hikmah-api@test',fetch:fake});
assert.equal(await reporter.report(new Error('insert failed for '+email+' actor '+auth),{tags:{backend_version:'test',resource:'game',empty:undefined}}),true);
assert.equal(calls.length,1);assert.equal(calls[0].url,'https://o123.ingest.de.sentry.io/api/456/envelope/');
assert.match(calls[0].options.headers['X-Sentry-Auth'],/sentry_version=7, sentry_client=hikmah-reporter\/1\.0, sentry_key=0123456789abcdef0123456789abcdef$/);
const lines=calls[0].options.body.trim().split('\n');
assert.equal(lines.length,3);assert.deepEqual(JSON.parse(lines[1]),{type:'event'});
const payload=JSON.parse(lines[2]);
assert.deepEqual(payload.tags,{surface:'edge-function',backend_version:'test',resource:'game'});
assert.equal(payload.release,'hikmah-api@test');assert(payload.exception.values[0].stacktrace.frames.length>0);
assert(!calls[0].options.body.includes(email)&&!calls[0].options.body.includes(auth.slice(3)));
assert.equal(await createReporter({dsn,surface:'x',fetch:async()=>{throw new Error('offline')}}).report(new Error('x')),false);
console.log('Passed: text, URL, breadcrumb and event scrubbing; EU-only DSN guard; scrubbed envelope reporter that never throws.');
