import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'hikmah-transport-')),originalFetch=globalThis.fetch,originalDocument=globalThis.document;
try{
 await build({entryPoints:['lib/game/transport.ts'],outfile:join(dir,'transport.mjs'),bundle:true,platform:'node',format:'esm'});
 const {gameApi,gameErrorText}=await import(pathToFileURL(join(dir,'transport.mjs')).href);
 const en=(a,b)=>a,ar=(a,b)=>b;
 const english='The game service is temporarily unavailable. Please try again.';
 const arabic=gameErrorText(english,ar);
 assert(/[\u0600-\u06ff]/.test(arabic));assert.equal(gameErrorText(arabic,en),english);
 assert.equal(gameErrorText('Choose a game and language.',ar),'Choose a game and language.');
 let calls=0;let mode='success';let sent;
 globalThis.fetch=async(url,options)=>{calls++;sent={url,options};if(mode==='offline')throw new TypeError('internal network detail');if(mode==='html')return new Response('<h1>private upstream detail</h1>',{status:502});if(mode==='bad-json')return new Response('bad json');if(mode==='validation')return Response.json({error:'Choose a game and language.'},{status:400});if(mode==='unavailable')return Response.json({error:'internal service detail'},{status:503});return Response.json({state:{round:2},correct:true})};
 assert.deepEqual(await gameApi('answer',{id:'room',answer:'test'},undefined,'en'),{state:{round:2},correct:true});
 assert.equal(sent.options.method,'POST');assert.equal(JSON.parse(sent.options.body).action,'answer');
 for(const scenario of ['offline','html','bad-json','unavailable'])for(const locale of ['en','ar']){
  mode=scenario;const before=calls;
  await assert.rejects(()=>gameApi('answer',{answer:'test'},undefined,locale),error=>{assert(!error.message.includes('internal')&&!error.message.includes('<h1>')&&!error.message.includes('Unexpected token'));assert(locale==='ar'?/[\u0600-\u06ff]/.test(error.message):/game/.test(error.message));return true});
  assert.equal(calls,before+1,'a failed move must not be replayed automatically');
 }
 mode='validation';await assert.rejects(()=>gameApi('create',{},undefined,'en'),/Choose a game and language/);
 mode='success';await gameApi('room',undefined,{id:'room'},'en');assert.match(sent.url,/action=room/);assert.match(sent.url,/id=room/);
 globalThis.document={documentElement:{lang:'en'}};
 globalThis.fetch=async()=>{document.documentElement.lang='ar';return new Response('unavailable',{status:503})};
 await assert.rejects(()=>gameApi('dashboard'),error=>/[\u0600-\u06ff]/.test(error.message),'a pending request must use the current UI language when it fails');
 console.log('Passed: localized connection/service errors, safe non-JSON handling, no automatic move replay, authoritative state and validation messages preserved.');
}finally{globalThis.fetch=originalFetch;if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;rmSync(dir,{recursive:true,force:true})}
