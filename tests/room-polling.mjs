import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// Exercise the actual Play effect with a delayed transport and controlled timers.
const dir=mkdtempSync(join(tmpdir(),'hikmah-poll-'));
const effects=[],updates=[],pending=[],timers=new Map();let index=0,nextTimer=0,calls=0;
globalThis.__hooks={useState(value){const n=index++;return [n===0?'test-room':value,v=>updates.push([n,v])]},useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn)};
globalThis.__roomApi=()=>{calls++;return new Promise((resolve,reject)=>pending.push({resolve,reject}))};
const realSet=globalThis.setTimeout,realClear=globalThis.clearTimeout;
globalThis.setTimeout=fn=>{timers.set(++nextTimer,fn);return nextTimer};globalThis.clearTimeout=id=>timers.delete(id);
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
try{
 await build({entryPoints:['components/hikmah/play.tsx'],outfile:join(dir,'play.mjs'),bundle:true,format:'esm',platform:'node',jsx:'automatic',plugins:[{name:'transport-hooks',setup(b){
  b.onResolve({filter:/^(react|react\/jsx-runtime|lucide-react|\.\/shared|@\/components\/ui\/)/},args=>({path:args.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path==='react'?'export const {useState,useRef,useCallback,useEffect}=globalThis.__hooks':path==='react/jsx-runtime'?'export const Fragment="fragment"; export const jsx=()=>null; export const jsxs=jsx':path==='./shared'?'export const api=globalThis.__roomApi; export const avatar=()=>null, Loading=()=>null, title=()=>""':`export const ${path==='lucide-react'?'ArrowLeft,ArrowRight,Check,CheckCircle2,Clock,Copy,Delete,Flag,RotateCcw,Trophy':path.endsWith('alert-dialog')?'AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger':'Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle'} = null;`.replace(/export const (.*) = null;/,(_,names)=>'export const '+names.split(',').map(n=>n+'=()=>null').join(',')+';')}));
 }}]});
 const {Play}=await import(join(dir,'play.mjs'));Play({t:x=>x,locale:'en',refresh(){}});
 const cleanup=effects[1]();assert.equal(calls,1);assert.equal(timers.size,0,'slow responses must not overlap with new polls');
 await flush();assert.equal(calls,1);
 pending.shift().resolve({serverTime:Date.now(),marker:'slow-success'});await flush();
 assert(updates.some(([n,v])=>n===1&&v.marker==='slow-success'),'slow response reaches the UI');assert.equal(timers.size,1);
 const [id,tick]=timers.entries().next().value;timers.delete(id);tick();assert.equal(calls,2);
 pending.shift().reject(new Error('temporary disconnect'));await flush();assert.equal(timers.size,1,'polling recovers after failure');
 const [id2,tick2]=timers.entries().next().value;timers.delete(id2);tick2();cleanup();
 const before=updates.length;pending.shift().resolve({serverTime:Date.now(),marker:'after-unmount'});await flush();
 assert.equal(updates.length,before,'unmounted room ignores late response');assert.equal(timers.size,0);
 console.log('Passed: delayed room responses render, no overlapping polling, recovery after disconnect, cleanup ignores stale responses.');
}finally{globalThis.setTimeout=realSet;globalThis.clearTimeout=realClear;delete globalThis.__hooks;delete globalThis.__roomApi;rmSync(dir,{recursive:true,force:true})}
