/* global Netlify */
export default async function privacyMaintenance() {
  const base=Netlify.env.get('HIKMAH_BACKEND_URL'),token=Netlify.env.get('HIKMAH_BACKEND_TOKEN');
  if(!base||!token)throw new Error('Privacy maintenance is not configured.');
  const url=new URL(base);url.searchParams.set('resource','maintenance');url.searchParams.set('method','POST');
  const response=await fetch(url,{method:'POST',headers:{'x-hikmah-server-token':token,'x-region':Netlify.env.get('HIKMAH_BACKEND_REGION')||'eu-central-1'},signal:AbortSignal.timeout(25_000)});
  if(!response.ok)throw new Error('Privacy maintenance needs retry.');
  const result=await response.json();
  if(result.erasureJobsChecked!==result.erasureJobsCompleted||result.storageJobsChecked!==result.storageJobsCompleted)throw new Error('Some privacy cleanup jobs remain pending.');
};
export const config={schedule:'0 3 * * *'};
