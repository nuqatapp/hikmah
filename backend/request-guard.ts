import {one} from '../lib/game/service';

export async function reserveRequest(op:'signup'|'create',client:string|null,proof?:string|null,now=Date.now()){
  if(!client||!/^[a-f0-9]{64}$/.test(client))return Response.json({error:'Request verification unavailable.'},{status:503});
  const size=3600, hour=Math.floor(now/(size*1000)),limit=op==='signup'?3:12;
  // The private settings table already has a unique key and the server-only grant.
  // Upsert under the unique key serializes reservations from separate server instances.
  const counter='guard:'+new Date(now).toISOString().slice(0,10)+':'+op+':'+hour+':'+client;
  const row=await one(`INSERT INTO site_settings(key,value) VALUES(?,'1')
    ON CONFLICT(key) DO UPDATE SET value=CAST(CAST(site_settings.value AS INTEGER)+1 AS TEXT)
    WHERE CAST(site_settings.value AS INTEGER)<? RETURNING value`,counter,limit);
  if(!row)return Response.json({code:'over_request_rate_limit',error:'Too many requests. Try again later.'},{status:429,headers:{'Retry-After':String(size-Math.floor(now/1000)%size)}});
  if(op==='signup'){
    if(!proof||!/^[a-f0-9]{64}$/.test(proof))return Response.json({code:'captcha',error:'Complete verification again.'},{status:400});
    // A proof may straddle midnight. Use its signature as the unique key and retain its use for 24 hours.
    const used=await one("INSERT INTO site_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING RETURNING value",'proof:'+proof,String(now));
    if(!used)return Response.json({code:'captcha',error:'Complete verification again.'},{status:400});
  }
  return null;
}
