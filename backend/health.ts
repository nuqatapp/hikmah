import {withDatabase,type createConnection} from '../db/raw';
import {many,one,run} from '../lib/game/service';

type Connection=ReturnType<typeof createConnection>;
export type RequestMeta={resource:string;action:string;kind?:'auth'|'game';sql?:Connection};

// Hourly counters in the private settings table: no player, room or address
// identifiers, only a fixed vocabulary. Privacy maintenance removes them after 48 hours.
const actions=new Set(['dashboard','export','room','lobby','leaderboard','profile','admin','health','create','join','start','leave','answer','skip','next','report','content','ban','archive','resolve','consent','delete','get','post','signup_rejected','callback_failed','confirm_failed']);
const resources=new Set(['game','avatar','signup-guard','signup-consent','maintenance','site']);
export const siteAuthReasons=['signup_rejected','callback_failed','confirm_failed'];
const hourKey=(time:number)=>new Date(time).toISOString().slice(0,13);
const increment="INSERT INTO site_settings(key,value) VALUES(?,'1') ON CONFLICT(key) DO UPDATE SET value=CAST(CAST(site_settings.value AS INTEGER)+1 AS TEXT)";

export async function recordFailure(sql:Connection,meta:RequestMeta,status:number) {
  const resource=resources.has(meta.resource)?meta.resource:'other',action=actions.has(meta.action)?meta.action:'other';
  const kind=meta.kind||(status===401||status===403||resource.startsWith('signup-')?'auth':'game');
  const key=['health:h',hourKey(Date.now()),kind,resource,action,String(status)].join(':');
  // Health accounting must never fail or delay a player's request for long.
  try{await Promise.race([withDatabase(sql,()=>run(increment,key)),new Promise(resolve=>setTimeout(resolve,2000))])}catch{}
}

export async function recordMaintenance(sql:Connection,result:Record<string,unknown>) {
  try{await withDatabase(sql,()=>run('INSERT INTO site_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','health:maintenance',JSON.stringify({...result,at:Date.now()})))}catch{}
}

export async function pruneHealth() {
  await run("DELETE FROM site_settings WHERE key LIKE 'health:h:%' AND key<?",'health:h:'+hourKey(Date.now()-2*86400_000));
}

// Runs inside the caller's database context, after its administrator check.
export async function healthSummary() {
  const rows=await many("SELECT key,value FROM site_settings WHERE key LIKE 'health:h:%' AND key>=? ORDER BY key DESC",'health:h:'+hourKey(Date.now()-24*3600_000));
  const failures=rows.map((row:{key:string;value:string})=>{
    // health:h:<YYYY-MM-DDTHH>:<kind>:<resource>:<action>:<status>
    const [, ,hour,kind,resource,action,status]=row.key.split(':');
    return {hour,kind,resource,action,status:Number(status),count:Number(row.value)||0};
  });
  const stored=await one("SELECT value FROM site_settings WHERE key='health:maintenance'");
  let maintenance=null;
  try{if(stored?.value)maintenance=JSON.parse(stored.value)}catch{}
  return {since:Date.now()-24*3600_000,failures,maintenance};
}
