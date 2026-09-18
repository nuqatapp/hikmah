import {mkdirSync, writeFileSync} from 'node:fs';
const esbuild = await import('esbuild');
mkdirSync('supabase/functions/hikmah-api', {recursive: true});
await esbuild.build({entryPoints: ['backend/index.ts'], outfile: 'supabase/functions/hikmah-api/index.js', bundle: true, platform: 'node', format: 'esm', target: 'es2022', external: ['postgres', 'node:*'], define: {'process.env.NODE_ENV': '"production"'}});
writeFileSync('supabase/functions/hikmah-api/deno.json', JSON.stringify({imports: {postgres: 'npm:postgres@3.4.8'}}, null, 2) + '\n');
console.log('Built portable Supabase game backend.');
