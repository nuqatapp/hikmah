import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=mkdtempSync(join(tmpdir(),'hikmah-proxy-'));
const originalFetch=globalThis.fetch;
const keys=['HIKMAH_BACKEND_URL','HIKMAH_BACKEND_TOKEN','HIKMAH_PREVIEW_BACKEND_URL','HIKMAH_PREVIEW_BACKEND_TOKEN'];
const original=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
const productionToken='a'.repeat(64),previewToken='b'.repeat(64);
let calls=[];
try{
 await build({entryPoints:['lib/backend-proxy.ts'],outfile:join(dir,'proxy.mjs'),bundle:true,platform:'node',format:'esm',plugins:[{name:'identity-fixture',setup(b){
  b.onResolve({filter:/^(server-only|\.\/site-identity)$/},args=>({path:args.path,namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path==='server-only'?'export {}':'export const siteIdentity=async()=>({id:"g_00000000-0000-0000-0000-000000000001",name:"Guest",signed:false})'}));
 }}]});
 const {proxyBackend}=await import(pathToFileURL(join(dir,'proxy.mjs')).href);
 globalThis.fetch=async(url,options)=>{calls.push({url:String(url),token:options.headers['x-hikmah-server-token']});return Response.json({ok:true},{headers:{'X-Hikmah-Backend-Version':'fixture'}})};
 const request=()=>new Request('https://game.example/api/game?action=dashboard',{headers:{host:'game.example'}});
 process.env.HIKMAH_BACKEND_URL='https://backend.example/production';
 process.env.HIKMAH_BACKEND_TOKEN=productionToken;
 process.env.HIKMAH_PREVIEW_BACKEND_TOKEN=previewToken;
 delete process.env.HIKMAH_PREVIEW_BACKEND_URL;
 let response=await proxyBackend(request(),'game');
 assert.equal(response.status,200);assert.equal(calls.at(-1).token,productionToken);assert.match(calls.at(-1).url,/\/production\?/);
 assert(!JSON.stringify([...response.headers]).includes(productionToken));assert(!JSON.stringify(await response.json()).includes(productionToken));
 process.env.HIKMAH_PREVIEW_BACKEND_URL='https://backend.example/candidate';
 process.env.HIKMAH_BACKEND_TOKEN='invalid old preview value';
 response=await proxyBackend(request(),'game');
 assert.equal(response.status,200);assert.equal(calls.at(-1).token,previewToken);assert.match(calls.at(-1).url,/\/candidate\?/);
 process.env.HIKMAH_BACKEND_TOKEN=productionToken;delete process.env.HIKMAH_PREVIEW_BACKEND_TOKEN;
 assert.equal((await proxyBackend(request(),'game')).status,200);assert.equal(calls.at(-1).token,productionToken,'existing preview deployments retain their fallback');
 process.env.HIKMAH_PREVIEW_BACKEND_TOKEN='invalid';const before=calls.length;
 response=await proxyBackend(request(),'game');assert.equal(response.status,503);assert.equal(response.headers.get('X-Hikmah-Error-Type'),'CredentialFormatError');assert.equal(calls.length,before,'invalid preview credentials never fall back silently');
 response=await proxyBackend(new Request('https://game.example/api/game',{method:'POST',headers:{host:'game.example',origin:'https://other.example'},body:'{}'}),'game');
 assert.equal(response.status,403);assert.equal(calls.length,before);
 console.log('Passed: production/preview credential isolation, compatibility fallback, invalid-secret rejection, safe responses and cross-origin protection.');
}finally{
 globalThis.fetch=originalFetch;for(const key of keys){if(original[key]===undefined)delete process.env[key];else process.env[key]=original[key]}
 rmSync(dir,{recursive:true,force:true});
}
