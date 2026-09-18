"""Verify private avatar storage using a temporary integration account."""
import base64, importlib.util, json, os, urllib.parse, urllib.request
spec=importlib.util.spec_from_file_location('checks','tests/supabase-backend.py')
checks=importlib.util.module_from_spec(spec);spec.loader.exec_module(checks)
actor=checks.user('diagnostic')
checks.api(actor)
boundary='hikmah-integration-boundary'
image=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lL8AAAAASUVORK5CYII=')
body=('--'+boundary+'\r\nContent-Disposition: form-data; name="avatar"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n').encode()+image+('\r\n--'+boundary+'--\r\n').encode()
headers={'x-hikmah-server-token':checks.TOKEN,'x-hikmah-actor':urllib.parse.quote(json.dumps(actor)),'Content-Type':'multipart/form-data; boundary='+boundary}
req=urllib.request.Request(checks.BASE+'?resource=avatar&method=POST',data=body,headers=headers,method='POST')
with urllib.request.urlopen(req,timeout=45) as response:
    key=json.load(response)['avatar']
headers.pop('Content-Type')
req=urllib.request.Request(checks.BASE+'?resource=avatar&method=GET&key='+urllib.parse.quote(key),data=b'',headers=headers,method='POST')
with urllib.request.urlopen(req,timeout=45) as response:
    assert response.read()==image
checks.api(actor,'POST',{'action':'delete','confirm':'DELETE'})
print('Avatar upload, download and account deletion passed.',flush=True)
