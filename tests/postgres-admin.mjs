import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import postgres from 'postgres';
import {handleBackend} from '../supabase/functions/hikmah-api/index.js';

const url=new URL(process.env.HIKMAH_TEST_DATABASE_URL||'');
assert(['127.0.0.1','localhost'].includes(url.hostname)&&url.pathname==='/hikmah_test',
  'Use an empty local hikmah_test database.');
process.env.SUPABASE_DB_URL=url.href;
const sql=postgres(url.href,{max:1});
const token='8'.repeat(64);

async function request(actor,action,body){
  const target=new URL('https://backend.invalid');
  target.search=new URLSearchParams({resource:'game',method:body?'POST':'GET',action});
  return handleBackend(new Request(target,{
    method:'POST',
    headers:{'x-hikmah-server-token':token,'x-hikmah-actor':encodeURIComponent(JSON.stringify(actor)),
      'x-hikmah-client':'9'.repeat(64),'content-type':'application/json'},
    body:body?JSON.stringify({action,...body}):undefined,
  }));
}

try{
  await sql.unsafe(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE supabase_auth_admin;
    CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);`);
  const directory=new URL('../supabase/migrations/',import.meta.url);
  for(const file of (await readdir(directory)).filter(name=>name.endsWith('.sql')).sort()){
    const migration=await readFile(new URL(file,directory),'utf8');
    await sql.begin(tx=>tx.unsafe(migration));
  }
  const digest=createHash('sha256').update(token).digest('hex');
  await sql`INSERT INTO hikmah.server_credentials (id,token_hash) VALUES ('ci',${digest})`;
  const adminId='11111111-1111-4111-8111-111111111111';
  const playerId='22222222-2222-4222-8222-222222222222';
  const admin={id:'sb_'+adminId,authUserId:adminId,name:'CI admin',signed:true};
  const player={id:'sb_'+playerId,authUserId:playerId,name:'CI player',signed:true};
  await sql`INSERT INTO auth.users(id) VALUES (${adminId}),(${playerId})`;
  const consent={version:'2026-11-13',accepted:true,legalCapacity:true,capacity:'self'};
  assert.equal((await request(admin,'consent',consent)).status,200);
  assert.equal((await request(player,'consent',consent)).status,200);
  const guest={id:'g_00000000-0000-4000-8000-000000000001',name:'CI guest',signed:false};
  await sql`INSERT INTO hikmah.site_settings(key,value) VALUES ('admin_user',${admin.id})`;

  assert.equal((await request(guest,'admin')).status,401);
  assert.equal((await request(player,'admin')).status,403);
  const response=await request(admin,'admin');
  assert.equal(response.status,200);
  const {content}=await response.json();
  assert(content.length>=80);
  const puzzle=content.find(item=>item.active===1);
  assert.equal((await request(player,'archive',{id:puzzle.id,active:false})).status,403);
  assert.equal((await request(admin,'archive',{id:puzzle.id,active:false})).status,200);
  assert.equal((await sql`SELECT active FROM hikmah.content WHERE id=${puzzle.id}`)[0].active,0);
  assert.equal((await request(admin,'archive',{id:puzzle.id,active:true})).status,200);
  assert.equal((await sql`SELECT active FROM hikmah.content WHERE id=${puzzle.id}`)[0].active,1);

  assert.equal((await request(player,'ban',{id:admin.id,banned:true})).status,403);
  assert.equal((await request(admin,'ban',{id:admin.id,banned:true})).status,400);
  assert.equal((await request(admin,'ban',{id:player.id,banned:true})).status,200);
  assert.equal((await request(player,'create',{kind:'mcq',locale:'en',mode:'solo'})).status,403);
  assert.equal((await request(admin,'ban',{id:player.id,banned:false})).status,200);
  const create=await request(player,'create',{kind:'mcq',locale:'en',mode:'solo'});
  assert.equal(create.status,200);
  const {id}=await create.json();
  const [round]=await sql`SELECT id,snapshot FROM hikmah.rounds WHERE room=${id} AND number=1`;
  const snapshot=JSON.parse(round.snapshot);
  const answer=await request(player,'answer',{id,roundId:round.id,answer:Number(snapshot.answer)});
  assert.equal(answer.status,200);
  assert.equal((await answer.json()).reward,7);
  console.log('Passed PostgreSQL migrations, admin authorization, archive/restore, suspend/restore and a game reward.');
}finally{
  await sql.end();
}
