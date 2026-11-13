// Disposable local browser-verification environment. No production credentials/data.
import {createServer} from 'node:http';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {mkdirSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

mkdirSync('.sites-runtime',{recursive:true});
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
for(const file of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+file,'utf8'));
db.exec('ALTER TABLE profiles ADD COLUMN auth_user_id TEXT;CREATE TABLE auth_users(id TEXT PRIMARY KEY)');
const migration=readFileSync('supabase/migrations/20261113075118_privacy_account_lifecycle.sql','utf8');
db.exec(migration.replace(/hikmah\./g,'').replace(/auth\.users/g,'auth_users').split('\n').filter(x=>!/^\s*(ALTER TABLE|GRANT|REVOKE|CREATE POLICY)/.test(x)).join('\n'));
class Statement{constructor(query,args=[]){this.query=query;this.args=args}bind(...args){return new Statement(this.query,args)}async first(){return db.prepare(this.query).get(...this.args)||null}async all(){return {results:db.prepare(this.query).all(...this.args)}}async run(){return {meta:db.prepare(this.query).run(...this.args)}}}
globalThis.__localDb={prepare:q=>new Statement(q),batch:async statements=>{const out=[];for(const statement of statements)out.push(await statement.run());return out}};
await build({stdin:{contents:`export * as game from './backend/game-route';export {NextRequest} from './backend/http';export {actorContext} from './lib/game/actor';export {init,ensureProfile,run} from './lib/game/service';`,resolveDir:process.cwd()},outfile:'.sites-runtime/local-backend.mjs',bundle:true,platform:'node',format:'esm',plugins:[{name:'local-database',setup(b){b.onResolve({filter:/^@\/db\/raw$/},()=>({path:'db',namespace:'local'}));b.onLoad({filter:/.*/,namespace:'local'},()=>({contents:'export function database(){return globalThis.__localDb} export function bucket(){throw new Error("No avatar files in this disposable fixture")}' }));}}]});
const backend=await import(pathToFileURL(resolve('.sites-runtime/local-backend.mjs')).href);await backend.init();
const users=new Map();const password='Local-audit-password-2026';
for(const [index,name] of ['Alice','Bob','Charlie'].entries()){
 const digit=String(index+1),id=digit.repeat(8)+'-'+digit.repeat(4)+'-4'+digit.repeat(3)+'-8'+digit.repeat(3)+'-'+digit.repeat(12);
 const user={id,aud:'authenticated',role:'authenticated',email:name.toLowerCase()+'@audit.invalid',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),is_anonymous:false,user_metadata:{full_name:'Test '+name},app_metadata:{provider:'email'}};
 users.set(user.email,user);db.prepare('INSERT INTO auth_users(id) VALUES(?)').run(id);
 if(name!=='Charlie')db.prepare('INSERT INTO account_consents(auth_user_id,terms_version,capacity,relationship,accepted_at,verification_method) VALUES(?,?,?,?,?,?)').run(id,'2026-11-13','self',null,Date.now(),'local_test_fixture');
}
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function tokenFor(user){return encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)})+'.local-only'}
function sessionFor(user){return {access_token:tokenFor(user),refresh_token:'local-'+user.id,expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user}}
function userFrom(request){return [...users.values()].find(u=>request.headers.authorization==='Bearer '+tokenFor(u))}
let origin='';
const server=createServer(async(request,response)=>{
 response.setHeader('Content-Type','application/json');
 if(request.headers.origin===origin){response.setHeader('Access-Control-Allow-Origin',origin);response.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');response.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS')}
 if(request.method==='OPTIONS'){response.statusCode=204;response.end();return}
 try{
  const chunks=[];for await(const chunk of request)chunks.push(chunk);const bytes=Buffer.concat(chunks);
  const url=new URL(request.url,'http://127.0.0.1');
  if(url.pathname==='/auth/v1/settings'){response.end(JSON.stringify({external:{email:true,google:false}}));return}
  if(url.pathname==='/auth/v1/user'){const user=userFrom(request);response.statusCode=user?200:401;response.end(JSON.stringify(user||{message:'Invalid fixture session'}));return}
  if(url.pathname==='/auth/v1/token'){
   const value=JSON.parse(bytes.toString()),user=url.searchParams.get('grant_type')==='refresh_token'?[...users.values()].find(u=>value.refresh_token==='local-'+u.id):users.get(value.email);
   if(!user||(value.password&&value.password!==password)){response.statusCode=400;response.end(JSON.stringify({message:'Invalid fixture credentials'}));return}
   response.end(JSON.stringify(sessionFor(user)));return;
  }
  if(url.pathname==='/auth/v1/logout'){response.end('{}');return}
  if(url.pathname.startsWith('/auth/')){response.statusCode=400;response.end(JSON.stringify({message:'Only the disposable fixture accounts can sign in. No emails are sent.'}));return}
  if(request.headers['x-hikmah-server-token']!=='local-preview-token'){response.statusCode=401;response.end('{}');return}
  const actor=JSON.parse(decodeURIComponent(request.headers['x-hikmah-actor']||''));
  const method=url.searchParams.get('method');url.searchParams.delete('resource');url.searchParams.delete('method');
  const headers=new Headers();if(bytes.length){headers.set('Content-Type','application/json');headers.set('Content-Length',String(bytes.length))}
  const result=await backend.actorContext.run(actor,()=>backend.game[method](new backend.NextRequest(url,{method,headers,body:bytes.length?bytes:undefined})));
  response.statusCode=result.status;for(const [key,value] of result.headers)response.setHeader(key,value);response.end(Buffer.from(await result.arrayBuffer()));
 }catch(error){response.statusCode=500;response.end(JSON.stringify({error:error.message}));console.error('Local fixture error:',error.message)}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const reserve=createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));origin='http://127.0.0.1:'+port;
const upstream='http://127.0.0.1:'+server.address().port;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:upstream,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'local-preview-key',HIKMAH_BACKEND_URL:upstream+'/function',HIKMAH_BACKEND_TOKEN:'local-preview-token'},windowsHide:true,stdio:['ignore','pipe','pipe']});
child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);
console.log(JSON.stringify({preview:origin,fixtureUsers:[...users.keys()],fixturePassword:password,pid:process.pid,childPid:child.pid,note:'Local-only fake accounts; no email or production calls. Send stop on stdin to close.'}));
let stopping=false;async function stop(){if(stopping)return;stopping=true;child.kill();server.closeAllConnections();server.close();db.close();process.exit(0)}
process.stdin.setEncoding('utf8');process.stdin.on('data',data=>{if(data.includes('stop'))void stop()});process.on('SIGINT',stop);process.on('SIGTERM',stop);
