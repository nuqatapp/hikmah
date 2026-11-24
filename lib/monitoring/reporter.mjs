// Dependency-free error reporter for runtimes that do not run the Sentry SDK
// (the Supabase Edge Function and the Netlify scheduled function). It speaks
// Sentry's documented envelope protocol and sends only what scrubEvent allows.
import {scrubEvent} from './scrub.mjs';

/**
 * Only an EU (Germany) ingest DSN is accepted. Anything else disables reporting.
 * @param {unknown} value
 * @returns {{dsn:string,key:string,origin:string,projectId:string,endpoint:string}|null}
 */
export function parseDsn(value){
  if(typeof value!=='string'||!value)return null;
  try{
    const url=new URL(value.trim());
    const projectId=url.pathname.replace(/^\//,'');
    if(url.protocol!=='https:'||!/^o\d+\.ingest\.de\.sentry\.io$/.test(url.hostname)||!/^[a-f0-9]{32}$/.test(url.username)||!/^\d+$/.test(projectId))return null;
    return {dsn:'https://'+url.username+'@'+url.hostname+'/'+projectId,key:url.username,origin:url.origin,projectId,endpoint:url.origin+'/api/'+projectId+'/envelope/'};
  }catch{return null}
}

/** @param {unknown} stack @returns {any[]} */
function frames(stack){
  if(typeof stack!=='string')return [];
  const out=[];
  for(const line of stack.split('\n').slice(1,40)){
    const match=/^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(line);
    if(!match)continue;
    out.push({function:match[1]||'<anonymous>',filename:match[2],lineno:Number(match[3]),colno:Number(match[4]),in_app:!/node_modules|^node:|^ext:/.test(match[2])});
  }
  return out.reverse();
}

/**
 * @param {{dsn:unknown,surface:string,release?:string,environment?:string,fetch?:typeof fetch}} options
 */
export function createReporter(options){
  const target=parseDsn(options.dsn);
  /**
   * @param {unknown} error
   * @param {{tags?:Record<string,string|undefined>,level?:'error'|'warning'|'fatal',fingerprint?:string[]}} [detail]
   * @returns {Promise<boolean>} true when Sentry accepted the report
   */
  async function report(error,detail={}){
    if(!target)return false;
    try{
      const failure=error instanceof Error?error:new Error(typeof error==='string'?error:'Unknown failure');
      const id=crypto.randomUUID().replaceAll('-','');
      const tags={surface:options.surface};
      for(const [key,value] of Object.entries(detail.tags||{}))if(typeof value==='string'&&value)tags[key]=value;
      const event=scrubEvent({
        event_id:id,timestamp:Date.now()/1000,platform:'javascript',level:detail.level||'error',
        environment:options.environment||'production',release:options.release,tags,
        ...(detail.fingerprint&&{fingerprint:detail.fingerprint}),
        exception:{values:[{type:failure.name||'Error',value:failure.message,stacktrace:{frames:frames(failure.stack)},mechanism:{type:'generic',handled:true}}]},
      });
      const body=JSON.stringify({event_id:id,sent_at:new Date().toISOString(),dsn:target.dsn})+'\n'+JSON.stringify({type:'event'})+'\n'+JSON.stringify(event)+'\n';
      const response=await (options.fetch||fetch)(target.endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/x-sentry-envelope','X-Sentry-Auth':'Sentry sentry_version=7, sentry_client=hikmah-reporter/1.0, sentry_key='+target.key},
        body,signal:AbortSignal.timeout(3000),
      });
      return response.ok;
    }catch{return false}
  }
  return {enabled:!!target,report};
}
