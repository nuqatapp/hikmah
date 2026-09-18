"""Opt-in integration test against the configured Supabase backend.

Uses only test-prefixed identities. Remove their records after the test using
the accompanying SQL cleanup in README. Never run against active player IDs.
"""
import concurrent.futures
import json
import os
import time
import unicodedata
import urllib.parse
from pathlib import Path
import urllib.request
import urllib.error

def post(url, params=None, json_body=None, headers=None, timeout=45):
    if params: url += '?' + urllib.parse.urlencode(params)
    data = json.dumps(json_body).encode() if json_body is not None else b''
    req = urllib.request.Request(url, data=data, headers={**(headers or {}), 'Content-Type':'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()

BASE = os.environ['HIKMAH_BACKEND_URL']
TOKEN = os.environ['HIKMAH_BACKEND_TOKEN']
PREFIX = 'integration-20260916-'
SEEDS = {x['id']: x for x in json.loads(Path('lib/game/seed.json').read_text())}

def api(actor, method='GET', body=None, **query):
    headers = {'x-hikmah-server-token': TOKEN, 'x-hikmah-actor': urllib.parse.quote(json.dumps(actor))}
    status, raw = post(BASE, params={'resource': 'game', 'method': method, **query}, json_body=body, headers=headers, timeout=45)
    result = json.loads(raw)
    if status != 200:
        raise AssertionError((status, body or query, result))
    return result

def user(label):
    return {'id': PREFIX + label, 'name': 'Integration ' + label, 'signed': True}

def norm(text):
    return ''.join(c for c in unicodedata.normalize('NFKC', text) if not ('\u064b' <= c <= '\u065f') and c not in '\u0670\u0640').translate(str.maketrans({'أ':'ا','إ':'ا','آ':'ا','ى':'ي'})).upper().strip()

def answer(puzzle):
    seed = SEEDS[puzzle['id']]
    if seed['kind'] == 'mcq':
        return puzzle['choices'].index(seed['choices'][int(seed['answer'])])
    if seed['kind'] == 'letters':
        return seed['answer']
    return {str(t['code']): c for t, c in zip(puzzle['tokens'], norm(seed['prompt'])) if t['code']}

def scenario(kind, locale):
    a, b = user(kind + locale + '-a'), user(kind + locale + '-b')
    for u in [a, b]:
        assert api(u)['profile']['balance'] == 20
    solo = api(a, 'POST', {'action':'create','kind':kind,'locale':locale,'mode':'solo'})
    state = api(a, action='room', id=solo['id'])
    assert state['room']['total'] == 10
    payload = {'action':'answer','id':solo['id'],'roundId':state['round']['id'],'answer':answer(state['round']['puzzle'])}
    assert api(a, 'POST', payload)['correct']
    balance = api(a)['profile']['balance']
    api(a, 'POST', payload)
    assert api(a)['profile']['balance'] == balance
    api(a, 'POST', {'action':'leave','id':solo['id']})
    room = api(a, 'POST', {'action':'create','kind':kind,'locale':locale,'mode':'multi'})
    api(b, 'POST', {'action':'join','code':room['code']})
    api(a, 'POST', {'action':'start','id':room['id']})
    state = api(a, action='room', id=room['id'])
    other = api(b, action='room', id=room['id'])
    assert state['room']['total'] == 5
    assert state['round']['puzzle'] == other['round']['puzzle']
    time.sleep(max(0, (state['round']['startedAt'] - time.time()*1000)/1000) + .05)
    payload = {'action':'answer','id':room['id'],'roundId':state['round']['id'],'answer':answer(state['round']['puzzle'])}
    with concurrent.futures.ThreadPoolExecutor(2) as pool:
        results = list(pool.map(lambda u: api(u, 'POST', payload), [a,b]))
    assert sum(x['correct'] for x in results) == 1, results
    state = api(a, action='room', id=room['id'])
    assert sum(x['wins'] for x in state['players']) == 1
    api(a, 'POST', {'action':'leave','id':room['id']})
    api(b, 'POST', {'action':'leave','id':room['id']})
    # Exercise SQL aggregates, profile history and balance numeric decoding.
    api(a, action='profile')
    api(a, action='leaderboard', period='all')
    print(json.dumps({'passed':kind+'-'+locale,'checks':['solo','identical multiplayer puzzles','one race winner','no duplicate HR','history','leaderboard']}), flush=True)

if __name__ == '__main__':
    no_token, _ = post(BASE, timeout=45)
    assert no_token == 401
    forged, _ = post(BASE, headers={'x-hikmah-server-token':'0'*64}, timeout=45)
    assert forged == 401
    with concurrent.futures.ThreadPoolExecutor(3) as pool:
        list(pool.map(lambda x: scenario(*x), [(k,l) for k in ['mcq','letters','cryptogram'] for l in ['en','ar']]))
    print('Supabase integration checks passed.', flush=True)
