import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=mkdtempSync(join(tmpdir(),'hikmah-privacy-')),db=new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON');
for(const file of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+file,'utf8'));
db.exec('ALTER TABLE profiles ADD COLUMN auth_user_id TEXT; CREATE TABLE auth_users(id TEXT PRIMARY KEY)');
const migration=readFileSync('supabase/migrations/20261113075118_privacy_account_lifecycle.sql','utf8');
db.exec(migration.replace(/hikmah\./g,'').replace(/auth\.users/g,'auth_users').split('\n').filter(line=>!/^\s*(ALTER TABLE|REVOKE|GRANT|CREATE POLICY)/.test(line)).join('\n'));
class Statement{
 constructor(query,args=[]){this.query=query;this.args=args}
 bind(...args){return new Statement(this.query,args)}
 async first(){return db.prepare(this.query).get(...this.args)||null}
 async all(){return {results:db.prepare(this.query).all(...this.args)}}
 async run(){return {meta:db.prepare(this.query).run(...this.args)}}
}
globalThis.__db={prepare:query=>new Statement(query),batch:async statements=>{db.exec('BEGIN');try{const rows=[];for(const statement of statements)rows.push(await statement.run());db.exec('COMMIT');return rows}catch(e){db.exec('ROLLBACK');throw e}}};
let storageFailure=false,authFailure=false,authDeletes=0,storageDeletes=0;
globalThis.__bucket={delete:async()=>{storageDeletes++;if(storageFailure)throw new Error('simulated storage outage')}};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{assert.equal(options.method,'DELETE');assert.match(String(url),/\/auth\/v1\/admin\/users\/[a-f0-9-]+$/);authDeletes++;return new Response('{}',{status:authFailure?503:200})};
process.env.SUPABASE_URL='https://test.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-key';
await build({stdin:{contents:`export * from './lib/game/service';export * from './lib/game/privacy';export * from './backend/privacy-jobs';export * as routes from './backend/game-route';export {NextRequest} from './backend/http';export {ACCOUNT_POLICY_VERSION} from './lib/policy';`,resolveDir:process.cwd()},outfile:join(dir,'privacy.mjs'),bundle:true,platform:'node',format:'esm',plugins:[{name:'test-adapters',setup(b){
 b.onResolve({filter:/^@\/db\/raw$|^\.\.\/db\/raw$/},()=>({path:'database',namespace:'mock'}));
 b.onResolve({filter:/^\.\/actor$/},()=>({path:'actor',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path==='actor'?'export async function identity(){return globalThis.__actor}':'export function database(){return globalThis.__db} export function bucket(){return globalThis.__bucket} export async function withDatabase(sql,work){return work()}'}));
}}]});
const s=await import(pathToFileURL(join(dir,'privacy.mjs')).href);
const alice={id:'sb_11111111-1111-4111-8111-111111111111',authUserId:'11111111-1111-4111-8111-111111111111',name:'Test Alice',signed:true};
const bob={id:'sb_22222222-2222-4222-8222-222222222222',authUserId:'22222222-2222-4222-8222-222222222222',name:'Test Bob',signed:true};
const guest={id:'g_00000000-0000-4000-8000-000000000000',name:'Guest',signed:false};
const consent={version:s.ACCOUNT_POLICY_VERSION,accepted:true,legalCapacity:true,capacity:'self'};
const post=body=>s.routes.POST(new s.NextRequest('https://game.invalid/api/game',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://game.invalid'},body:JSON.stringify(body)}));
try{
 await s.init();for(const user of [alice,bob]){db.prepare('INSERT INTO auth_users(id) VALUES(?)').run(user.authUserId);await s.ensureProfile(user)}
 globalThis.__actor=alice;
 assert.equal((await post({action:'create',kind:'mcq',locale:'en',mode:'solo'})).status,403,'unconsented account cannot play');
 assert.equal((await post({action:'consent',...consent,version:'old'})).status,400);
 assert.equal((await post({action:'consent',...consent,legalCapacity:false})).status,400);
 assert.equal((await post({action:'consent',...consent,capacity:'guardian'})).status,400);
 assert.equal((await post({action:'consent',...consent,auth_user_id:bob.authUserId})).status,200);
 assert.equal((await s.one('SELECT count(*) AS n FROM account_consents WHERE auth_user_id=?',bob.authUserId)).n,0,'request cannot write someone else’s consent');
 await post({action:'consent',...consent});assert.equal((await s.one('SELECT count(*) AS n FROM account_consents')).n,1,'consent acceptance is idempotent');
 globalThis.__actor=bob;
 assert.equal((await post({action:'consent',...consent,capacity:'guardian',relationship:'parent',childDataConsent:true})).status,200);
 assert.equal((await s.accountConsent(bob)).capacity,'guardian');
 globalThis.__actor=guest;assert.equal((await post({action:'consent',...consent})).status,401);await assert.rejects(s.exportAccountData,/verified account/);
 globalThis.__actor=alice;
 const created=await (await post({action:'create',kind:'mcq',locale:'en',mode:'solo'})).json();
 let state=await s.roomState(created.id,alice);const round=await s.one('SELECT * FROM rounds WHERE id=?',state.round.id),snapshot=JSON.parse(round.snapshot);
 const answered=await (await post({action:'answer',id:created.id,roundId:round.id,answer:Number(snapshot.answer)})).json();
 assert.equal(answered.correct,true);assert.equal(answered.state.round.winner,alice.id,'move response contains updated authoritative state');
 assert(answered.state.profile.balance>20);
 const next=await (await post({action:'next',id:created.id})).json();assert.equal(next.state.round.number,2);
 const exported=await s.exportAccountData();assert.equal(exported.accountId,alice.authUserId);assert(!JSON.stringify(exported).includes(bob.id),'export is isolated');
 await s.run('UPDATE profiles SET banned=1,avatar=? WHERE id=?','avatars/11111111-1111-4111-8111-111111111111.png',alice.id);
 assert.equal((await post({action:'delete',confirm:'wrong'})).status,400);
 assert.equal((await post({action:'delete',confirm:'DELETE'})).status,200,'suspended accounts retain erasure rights');
 assert.equal(await s.profile(alice.id),null);assert(await s.profile(bob.id));
 for(const table of ['members','attempts','wallet','reports'])assert.equal((await s.one('SELECT count(*) AS n FROM '+table+' WHERE user=?',alice.id)).n,0);
 assert.equal((await s.one('SELECT count(*) AS n FROM rooms WHERE host=?',alice.id)).n,0,'historical host identifiers are cleared');
 assert.equal((await s.one('SELECT count(*) AS n FROM account_consents WHERE auth_user_id=?',alice.authUserId)).n,0);
 assert.equal((await s.hasErasureJob({},alice.authUserId)).status,'pending');
 storageFailure=true;assert.equal(await s.finishErasure({},alice.authUserId),false);assert.equal(authDeletes,0,'Auth cannot be removed before storage cleanup');
 storageFailure=false;authFailure=true;assert.equal(await s.finishErasure({},alice.authUserId),false);
 assert.equal((await s.hasErasureJob({},alice.authUserId)).status,'pending','failed external cleanup remains durable');
 authFailure=false;assert.equal(await s.finishErasure({},alice.authUserId),true);
 const completed=await s.one('SELECT * FROM account_erasure_jobs WHERE auth_user_id=?',alice.authUserId);assert.equal(completed.status,'completed');assert.equal(completed.avatar_path,null);assert.equal(completed.attempts,3);
 const deletesBefore=authDeletes;assert.equal(await s.finishErasure({},alice.authUserId),true);assert.equal(authDeletes,deletesBefore,'completion retries are harmless');
 const old=Date.now()-31*86400_000;
 const oldGuest=await s.createRoom('letters','en','solo',guest);await s.run('UPDATE rooms SET updated_at=? WHERE id=?',old,oldGuest.id);
 const legacy=await s.createRoom('letters','en','solo',bob);await s.run('UPDATE rooms SET updated_at=? WHERE id=?',old,legacy.id);
 await s.run('INSERT INTO storage_deletion_jobs(path,requested_at) VALUES(?,?)','avatars/old.png',old);
 const maintenance=await s.runPrivacyMaintenance({});assert.equal(maintenance.storageJobsCompleted,1);
 assert.equal(await s.one('SELECT id FROM rooms WHERE id=?',oldGuest.id),null,'expired guest game is purged');
 assert(await s.one('SELECT id FROM rooms WHERE id=?',legacy.id),'signed-in game is preserved');
 assert(await s.profile(bob.id),'other accounts are preserved');
 console.log(JSON.stringify({passed:true,coverage:['server-enforced versioned consent','guardian authorisation','verified identity boundary','own-account export','authoritative move response','suspended-account erasure','host anonymisation','durable storage/Auth retries','idempotent cleanup','guest retention','other-user preservation']}));
}finally{globalThis.fetch=originalFetch;delete globalThis.__db;delete globalThis.__actor;delete globalThis.__bucket;delete process.env.SUPABASE_SERVICE_ROLE_KEY;delete process.env.SUPABASE_URL;db.close();rmSync(dir,{recursive:true,force:true})}
