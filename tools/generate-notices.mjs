import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const inventory=JSON.parse(readFileSync(process.argv[2]||'work/licenses.json','utf8').replace(/^\uFEFF/,''));
const lines=['HIKMAH THIRD-PARTY SOFTWARE NOTICES','Generated from the installed production dependency licence inventory.','Each package retains its respective copyright and licence.',''];
const missing=[];let packages=0;
for(const [licence,items] of Object.entries(inventory))for(const item of items){
 packages++;lines.push('='.repeat(72),item.name+' @ '+item.versions.join(', '),'Licence expression: '+licence,item.homepage||item.repository||'');
 let found=false;const seen=new Set();
 const paths=new Set([...item.paths,join(process.cwd(),'node_modules',item.name)]);
 try{let path=dirname(require.resolve(item.name));for(let i=0;i<8;i++){try{if(JSON.parse(readFileSync(join(path,'package.json'),'utf8')).name===item.name){paths.add(path);break}}catch{}const parent=dirname(path);if(parent===path)break;path=parent}}catch{}
 for(const path of paths){
  let names=[];try{names=readdirSync(path)}catch{}
  const files=names.filter(x=>/^(licen[cs]e|copying|notice|copyright)([.\-]|$)/i.test(x));
  if(item.name==='victory-vendor')try{for(const child of readdirSync(join(path,'lib-vendor')))files.push(join('lib-vendor',child,'LICENSE'))}catch{}
  for(const name of files)try{const content=readFileSync(join(path,name),'utf8');if(!seen.has(content)){lines.push('\n'+name+'\n'+content);seen.add(content)}found=true}catch{}
 }
 try{const content=readFileSync(join('tools','license-supplements',item.name.replaceAll('/','__')+'.txt'),'utf8');if(!seen.has(content))lines.push('\nUpstream licence supplement\n'+content);found=true}catch{}
 if(!found){missing.push(item.name);lines.push('Refer to the upstream package distribution for the full licence text.');}
 lines.push('');
}
writeFileSync('public/third-party-notices.txt',lines.join('\n'));
writeFileSync('THIRD_PARTY_NOTICES.md','# Third-party notices\n\nFull production-dependency notices are included in [public/third-party-notices.txt](public/third-party-notices.txt). The deployed site serves the same file at `/third-party-notices.txt`.\n\nFonts use device/system font stacks; no font binaries are distributed by the app. The operator confirmed ownership of the game and domain on 13 November 2026. Logo and puzzle provenance remain the operator’s responsibility; report rights concerns to Nuqat.app@gmail.com.\n\nRegenerate after dependency changes using `pnpm licenses list --prod --json`, then `node tools/generate-notices.mjs <inventory.json>`.\n');
console.log(JSON.stringify({packages,licenceGroups:Object.keys(inventory).length,missingLicenceFiles:missing,noticeBytes:Buffer.byteLength(lines.join('\n'))}));
