import 'server-only';
import {proxyBackend} from '../backend-proxy';
import {parseDsn} from './reporter.mjs';
import {scrubText} from './scrub.mjs';

// Counts a sign-in failure the site handled itself. Fixed reasons only; no
// address, email or account identifier is sent. Never delays or fails the caller for long.
export async function noteAuthFailure(reason:'signup_rejected'|'callback_failed'|'confirm_failed',origin:string) {
  try{
    await proxyBackend(new Request(new URL('/api/game',origin),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reason}),signal:AbortSignal.timeout(3000)}),'health-event');
  }catch{}
}

export type SentryIssues=
  |{state:'not_configured'}
  |{state:'unavailable';status?:number}
  |{state:'ok';issues:{id:string;shortId:string;title:string;level:string;count:number;firstSeen:string;lastSeen:string;link:string}[]};

// The read token stays on the server. Only an allowlist of issue fields reaches the administrator's browser.
export async function latestSentryIssues():Promise<SentryIssues> {
  const token=process.env.SENTRY_ISSUES_TOKEN?.trim(),org=process.env.SENTRY_ORG?.trim(),target=parseDsn(process.env.NEXT_PUBLIC_SENTRY_DSN);
  if(!token||!org||!target||!/^[a-z0-9][a-z0-9-]{0,62}$/.test(org))return {state:'not_configured'};
  try{
    // de.sentry.io is the documented API host for organisations stored in the EU (Frankfurt).
    const url=new URL('https://de.sentry.io/api/0/organizations/'+org+'/issues/');
    url.searchParams.set('project',target.projectId);
    url.searchParams.set('query','is:unresolved');
    url.searchParams.set('sort','date');
    url.searchParams.set('limit','10');
    url.searchParams.set('statsPeriod','14d');
    const response=await fetch(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!response.ok)return {state:'unavailable',status:response.status};
    const rows=await response.json();
    if(!Array.isArray(rows))return {state:'unavailable'};
    return {state:'ok',issues:rows.slice(0,10).map(row=>{
      let link='';
      try{const parsed=new URL(String(row?.permalink));if(parsed.protocol==='https:'&&/(^|\.)sentry\.io$/.test(parsed.hostname))link=parsed.origin+parsed.pathname}catch{}
      return {id:String(row?.id||''),shortId:String(row?.shortId||'').slice(0,60),title:scrubText(String(row?.title||'')).slice(0,300),level:String(row?.level||'error').slice(0,20),count:Number(row?.count)||0,firstSeen:String(row?.firstSeen||''),lastSeen:String(row?.lastSeen||''),link};
    })};
  }catch{return {state:'unavailable'}}
}
