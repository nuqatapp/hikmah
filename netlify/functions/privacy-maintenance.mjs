/* global Netlify */
import {createReporter} from '../../lib/monitoring/reporter.mjs';

async function maintain(state) {
  const base=Netlify.env.get('HIKMAH_BACKEND_URL'),token=Netlify.env.get('HIKMAH_BACKEND_TOKEN');
  if(!base||!token)throw new Error('Privacy maintenance is not configured.');
  const url=new URL(base);url.searchParams.set('resource','maintenance');url.searchParams.set('method','POST');
  const response=await fetch(url,{method:'POST',headers:{'x-hikmah-server-token':token,'x-region':Netlify.env.get('HIKMAH_BACKEND_REGION')||'eu-central-1'},signal:AbortSignal.timeout(25_000)});
  state.version=response.headers.get('x-hikmah-backend-version')||'unknown';
  state.status=String(response.status);
  if(!response.ok)throw new Error('Privacy maintenance needs retry.');
  const result=await response.json();
  if(result.erasureJobsChecked!==result.erasureJobsCompleted||result.storageJobsChecked!==result.storageJobsCompleted)throw new Error('Some privacy cleanup jobs remain pending.');
}

export default async function privacyMaintenance() {
  const state={version:'unknown',status:'none'};
  try{await maintain(state)}
  catch(error){
    // Fixed tags only. The report is sent before the failure is rethrown so
    // Netlify still records the run as failed and the next daily run retries.
    const reporter=createReporter({dsn:Netlify.env.get('NEXT_PUBLIC_SENTRY_DSN'),surface:'netlify-function',environment:Netlify.env.get('CONTEXT')||'production'});
    await reporter.report(error,{tags:{function:'privacy-maintenance',backend_version:/^[A-Za-z0-9._-]{1,60}$/.test(state.version)?state.version:'unknown',upstream_status:state.status},fingerprint:['privacy-maintenance',error instanceof Error?error.message:'unknown']});
    throw error;
  }
};
export const config={schedule:'0 3 * * *'};
