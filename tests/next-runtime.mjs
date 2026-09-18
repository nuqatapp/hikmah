import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const token = 'local-test-token';
let calls = 0;
const backend = createServer(async (request, response) => {
  assert.equal(request.headers['x-hikmah-server-token'], token);
  calls++;
  const actor = JSON.parse(decodeURIComponent(request.headers['x-hikmah-actor']));
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({actor, payload: Buffer.concat(chunks).toString(), path: request.url}));
});
backend.listen(0, '127.0.0.1');
await once(backend, 'listening');
const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
let output = '';
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  env: {...process.env, NODE_ENV: 'production', HIKMAH_BACKEND_URL: `http://127.0.0.1:${backend.address().port}/api`, HIKMAH_BACKEND_TOKEN: token},
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', value => {output += value;});
child.stderr.on('data', value => {output += value;});
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(output);
    try { ready = (await fetch(origin + '/login')).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'Next.js did not start: ' + output);
  for (const path of ['/', '/play', '/multiplayer', '/profile', '/leaderboard', '/settings', '/admin', '/login']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert((await response.text()).includes('Hikmah'), path);
  }
  const redirect = await fetch(origin + '/signin-with-chatgpt?return_to=/admin', {redirect: 'manual'});
  assert.equal(redirect.status, 307);
  assert(redirect.headers.get('location').startsWith('/login'));
  const response = await fetch(origin + '/api/game?action=dashboard', {headers: {
    'oai-authenticated-user-id': 'forged-admin',
    'oai-authenticated-user-email': 'forged@example.com',
    'x-hikmah-actor': encodeURIComponent(JSON.stringify({id: 'forged-admin', signed: true})),
  }});
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.actor.signed, false);
  assert.match(data.actor.id, /^g_[a-f0-9-]{36}$/);
  const cookie = response.headers.get('set-cookie');
  assert(cookie.includes('HttpOnly') && cookie.includes('Secure'));
  assert(!JSON.stringify(data).includes(token));
  const again = await fetch(origin + '/api/game?action=dashboard', {headers: {Cookie: cookie.split(';')[0]}});
  assert.equal((await again.json()).actor.id, data.actor.id);
  const before = calls;
  const blocked = await fetch(origin + '/api/game', {method: 'POST', headers: {Origin: 'https://other.example', 'Content-Type': 'application/json'}, body: JSON.stringify({action: 'create'})});
  assert.equal(blocked.status, 403);
  assert.equal(calls, before);
  const payload = {action: 'create', mode: 'solo', kind: 'letters', locale: 'en'};
  const post = await fetch(origin + '/api/game', {method: 'POST', headers: {Origin: origin, Cookie: cookie.split(';')[0], 'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
  assert.equal(post.status, 200);
  assert.deepEqual(JSON.parse((await post.json()).payload), payload);
  console.log('Passed: 8 Next.js pages, login redirect, API proxy, guest cookies, forged identity rejection, cross-origin rejection.');
} finally {
  if (child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
  backend.closeAllConnections();
  await new Promise(resolve => backend.close(resolve));
}
