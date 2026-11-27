import {monitoringDsn} from '@/lib/monitoring/options';
import {parseDsn} from '@/lib/monitoring/reporter.mjs';
export const dynamic='force-dynamic';

const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(status:number)=>new Response(null,{status,headers});
const allowedItems=['event','client_report'];

// Browser error reports are relayed through this route so the player's browser
// never connects to Sentry. Sentry sees this server's address, not the player's,
// and cannot derive a location from it. No request header is forwarded.
export async function POST(request:Request) {
  const target=parseDsn(monitoringDsn());
  if(!target)return reply(404);
  try{
    const origin=request.headers.get('origin');
    const host=request.headers.get('host')||new URL(request.url).host;
    if(!origin||new URL(origin).host!==host)return reply(403);
  }catch{return reply(403)}
  if(Number(request.headers.get('content-length'))>200_000)return reply(413);
  try{
    const body=await request.text();
    if(body.length>200_000)return reply(413);
    const lines=body.split('\n');
    // Only envelopes for this project, and only error events and their delivery statistics.
    if(parseDsn(JSON.parse(lines[0]).dsn)?.dsn!==target.dsn)return reply(400);
    for(let index=1;index<lines.length;index+=2){
      if(!lines[index])continue;
      if(!allowedItems.includes(JSON.parse(lines[index]).type))return reply(400);
    }
    try{
      const response=await fetch(target.endpoint,{method:'POST',headers:{'Content-Type':'application/x-sentry-envelope'},body,cache:'no-store',signal:AbortSignal.timeout(5000)});
      return reply(response.ok?200:502);
    }catch{return reply(502)}
  }catch{return reply(400)}
}
