import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const esbuild=await import('esbuild');
const tmp=mkdtempSync(join(tmpdir(),'hikmah-test-'));
const sql=new DatabaseSync(':memory:');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+f,'utf8'));
// The production Postgres schema adds a verified Auth identity mapping.
sql.exec('ALTER TABLE profiles ADD COLUMN auth_user_id TEXT; CREATE UNIQUE INDEX profile_auth_user ON profiles(auth_user_id);');
class Statement{constructor(q,args=[]){this.q=q;this.args=args}bind(...args){return new Statement(this.q,args)}async first(){return sql.prepare(this.q).get(...this.args)||null}async all(){return {results:sql.prepare(this.q).all(...this.args)}}async run(){return {meta:sql.prepare(this.q).run(...this.args)}}}
let serial=Promise.resolve();
globalThis.__db={prepare:q=>new Statement(q),batch:ss=>{const result=serial.then(async()=>{sql.exec('BEGIN');try{const out=[];for(const s of ss)out.push(await s.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}});serial=result.catch(()=>{});return result}};
await esbuild.build({entryPoints:['lib/game/service.ts'],outfile:join(tmp,'service.mjs'),bundle:true,platform:'node',format:'esm',plugins:[{name:'local-test-adapters',setup(b){b.onResolve({filter:/^(@\/db\/raw|@\/app\/chatgpt-auth|next\/headers)$/},args=>({path:args.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='@/db/raw'?'export function database(){return globalThis.__db}':args.path==='next/headers'?'export async function cookies(){return {get(){return {value:"g_00000000-0000-0000-0000-000000000000"}},set(){}}}':'export async function getChatGPTUser(){return null}'}))}}]});
await esbuild.build({entryPoints:['lib/game/rules.ts'],outfile:join(tmp,'rules.mjs'),bundle:true,platform:'node',format:'esm'});
const s=await import(join(tmp,'service.mjs')),rules=await import(join(tmp,'rules.mjs'));
let clock=1700000000000;const original=Date.now;Date.now=()=>clock;
const a={id:'test-alice',name:'Alice',signed:true},b={id:'test-bob',name:'Bob',signed:true},guest={id:'g_00000000-0000-0000-0000-000000000000',name:'Guest',signed:false};
function solve(snapshot){return snapshot.kind==='mcq'?Number(snapshot.answer):snapshot.kind==='letters'?snapshot.answer:Object.fromEntries(Object.entries(snapshot.codes).map(([letter,code])=>[code,letter]));}
try{
await s.init();assert.equal((await s.many('SELECT id FROM content')).length,80);
await s.ensureProfile(a);await s.ensureProfile(a);await s.ensureProfile(b);assert.equal((await s.profile(a.id)).balance,20);assert.equal((await s.profile(b.id)).balance,20);
assert.equal(await s.isAdmin(a.id),false,'first signup must not become administrator');
const mapped={id:'sb_11111111-1111-4111-8111-111111111111',authUserId:'11111111-1111-4111-8111-111111111111',name:'Mapped',signed:true};
await s.ensureProfile(mapped);await s.ensureProfile(mapped);
assert.equal((await s.profile(mapped.id)).auth_user_id,mapped.authUserId);
assert.equal((await s.profile(mapped.id)).balance,20,'mapping cannot duplicate welcome credit');
for(const c of JSON.parse(readFileSync('lib/game/seed.json','utf8'))){const snap=rules.snapshot(c),pub=rules.publicPuzzle(snap);assert(rules.checkAnswer(snap,solve(snap)),c.id);assert(!rules.checkAnswer(snap,c.kind==='mcq'?-1:c.kind==='letters'?'invalid':{}));assert(!('answer' in pub));if(c.kind==='cryptogram'){assert.equal(pub.prompt,'');assert(!JSON.stringify(pub).includes('cipherMap'));}if(c.kind==='letters')assert(pub.prompt.includes('_____'),c.id);}
await assert.rejects(()=>s.createRoom('mcq','en','multi',guest),/Sign in/);
let roundsChecked=0;
for(const kind of ['letters','mcq','cryptogram'])for(const locale of ['en','ar']){
 const solo=await s.createRoom(kind,locale,'solo',a);assert.equal((await s.roomState(solo.id,a)).room.total,10);
 for(let n=1;n<=10;n++){const state=await s.roomState(solo.id,a),rd=await s.one('SELECT * FROM rounds WHERE id=?',state.round.id);clock+=4000;const before=(await s.profile(a.id)).balance;const result=await s.submit(solo.id,rd.id,solve(JSON.parse(rd.snapshot)),a);assert(result.correct);await s.submit(solo.id,rd.id,solve(JSON.parse(rd.snapshot)),a);assert.equal((await s.profile(a.id)).balance,before+7,'duplicate reward');await s.advance(solo.id,a.id,true);roundsChecked++;}
 assert.equal((await s.roomState(solo.id,a)).room.status,'finished');
 const multi=await s.createRoom(kind,locale,'multi',a);await s.joinRoom(multi.code,b);await assert.rejects(()=>s.startRoom(multi.id,b.id),/host/);await s.startRoom(multi.id,a.id);
 for(let n=1;n<=5;n++){clock+=4000;const sa=await s.roomState(multi.id,a),sb=await s.roomState(multi.id,b);assert.deepEqual(sa.round.puzzle,sb.round.puzzle,'identical puzzles');const rd=await s.one('SELECT * FROM rounds WHERE id=?',sa.round.id);await s.submit(multi.id,rd.id,solve(JSON.parse(rd.snapshot)),a);const second=await s.submit(multi.id,rd.id,solve(JSON.parse(rd.snapshot)),b);assert(!second.correct,'second solver cannot win');assert.equal((await s.one('SELECT COUNT(*) n FROM wallet WHERE id=?','reward:'+rd.id)).n,1);clock+=6100;await s.advance(multi.id,b.id);roundsChecked++;}
 const result=await s.roomState(multi.id,b);assert.equal(result.room.status,'finished');assert.equal(result.players.find(p=>p.user===a.id).wins,5);
}
// Simultaneous correct submissions still award one round and one reward.
const race=await s.createRoom('cryptogram','en','multi',a);await s.joinRoom(race.code,b);await s.startRoom(race.id,a.id);clock+=4000;
let raceState=await s.roomState(race.id,a),raceRound=await s.one('SELECT * FROM rounds WHERE id=?',raceState.round.id);const correctAnswer=solve(JSON.parse(raceRound.snapshot));
const competing=await Promise.all([s.submit(race.id,raceRound.id,correctAnswer,a),s.submit(race.id,raceRound.id,correctAnswer,b)]);assert.equal(competing.filter(x=>x.correct).length,1);assert.equal((await s.one('SELECT COUNT(*) n FROM wallet WHERE id=?','reward:'+raceRound.id)).n,1);await s.leaveRoom(race.id,a.id);await s.leaveRoom(race.id,b.id);
// Wrong quiz answers lock the user out, then a timeout advances the match.
const wrong=await s.createRoom('mcq','en','multi',a);await s.joinRoom(wrong.code,b);await s.startRoom(wrong.id,a.id);clock+=4000;let st=await s.roomState(wrong.id,a),rd=await s.one('SELECT * FROM rounds WHERE id=?',st.round.id),snap=JSON.parse(rd.snapshot);
await s.submit(wrong.id,rd.id,(Number(snap.answer)+1)%snap.choices.length,a);await assert.rejects(()=>s.submit(wrong.id,rd.id,Number(snap.answer),a),/already answered/);clock+=50000;st=await s.roomState(wrong.id,b);assert.equal(st.round.outcome,'timeout');clock+=6100;st=await s.roomState(wrong.id,b);assert.equal(st.round.number,2);assert.equal(st.room.host,b.id,'host failover');await s.leaveRoom(wrong.id,a.id);await s.leaveRoom(wrong.id,b.id);
// Skip charging is atomic and cannot repeat.
const skip=await s.createRoom('letters','en','solo',b);st=await s.roomState(skip.id,b);let balance=(await s.profile(b.id)).balance;await s.submit(skip.id,st.round.id,null,b,true);await s.submit(skip.id,st.round.id,null,b,true);assert.equal((await s.profile(b.id)).balance,balance-5);await s.leaveRoom(skip.id,b.id);
// Guest play works without a wallet and cannot access someone else's game.
const g=await s.createRoom('letters','en','solo',guest);st=await s.roomState(g.id,guest);await assert.rejects(()=>s.roomState(g.id,a),/Join/);rd=await s.one('SELECT * FROM rounds WHERE id=?',st.round.id);await s.submit(g.id,rd.id,solve(JSON.parse(rd.snapshot)),guest);assert.equal((await s.one('SELECT COUNT(*) n FROM wallet WHERE user=?',guest.id)).n,0);
console.log(JSON.stringify({passed:true,seedPuzzles:80,completedRounds:roundsChecked,coverage:['all games and languages','solo and two-player races','identical puzzle snapshots','first solver wins','simultaneous submissions','duplicate reward prevention','guest isolation','wrong-answer lockout','timeout','host recovery','skip charging','fresh migration']}));
}finally{Date.now=original;sql.close();rmSync(tmp,{recursive:true,force:true})}
