// Regression test for the Missing Letters blank. Run with: node tests/letters-blank.mjs
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const esbuild=await import('esbuild');
const tmp=mkdtempSync(join(tmpdir(),'hikmah-blank-'));
await esbuild.build({entryPoints:['lib/game/rules.ts'],outfile:join(tmp,'rules.mjs'),bundle:true,platform:'node',format:'esm'});
const {snapshot,publicPuzzle,checkAnswer}=await import(pathToFileURL(join(tmp,'rules.mjs')).href);
const make=(locale,prompt,answer)=>({id:'t',kind:'letters',locale,prompt,answer,choices:[],clues:[],explanation:''});
const cases=[
 ['en','Practice makes perfect.','perfect','Practice makes _____.'],
 ['en','Honesty is the best policy.','honesty','_____ is the best policy.'],
 ['en','Let bygones be bygones.','bygones','Let _____ be _____.'],
 ['en','A penny saved is a penny earned.','penny','A _____ saved is a _____ earned.'],
 ['en','In the kingdom of the blind, the one-eyed man is king.','king','In the kingdom of the blind, the one-eyed man is _____.'],
 ['ar','كل تأخيرة وفيها خيرة','خيرة','كل تأخيرة وفيها _____'],
 ['ar','الأغنى من قنع بالقليل.','القليل','الأغنى من قنع ب_____.'],
 ['ar','الوقت كالسيف إن لم تقطعه قطعك','السيف','الوقت ك_____ إن لم تقطعه قطعك'],
 ['ar','من عاش بالسيف مات بالسيف.','السيف','من عاش ب_____ مات ب_____.'],
 ['ar','لا يُغسل الدم بالدم.','الدم','لا يُغسل _____ ب_____.'],
 ['ar','الكذب داء والصدق دواء','الصدق','الكذب داء و_____ دواء'],
];
for(const [locale,prompt,answer,expected] of cases){
 const s=snapshot(make(locale,prompt,answer)),p=publicPuzzle(s);
 assert.equal(p.prompt,expected,prompt);
 assert.ok(checkAnswer(s,answer),'correct answer accepted: '+prompt);
 assert.ok(!checkAnswer(s,answer+'x'),'wrong answer rejected: '+prompt);
 assert.equal([...p.bank].sort().join(''),[...s.bank].sort().join(''));
}
rmSync(tmp,{recursive:true,force:true});
console.log(JSON.stringify({passed:true,cases:cases.length}));
