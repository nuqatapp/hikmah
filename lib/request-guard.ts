import 'server-only';
import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';

export function backendToken(){
  const preview=process.env.HIKMAH_PREVIEW_BACKEND_URL;
  return (preview?process.env.HIKMAH_PREVIEW_BACKEND_TOKEN||process.env.HIKMAH_BACKEND_TOKEN:process.env.HIKMAH_BACKEND_TOKEN)?.trim();
}
export function keyedDigest(key:string,domain:string,value:string){
  return createHmac('sha256',key).update(domain+'\0'+value).digest('hex');
}
export function clientKey(request:Request,token:string){
  // Netlify overwrites its connection-IP header at ingress. Never use caller-supplied X-Forwarded-For.
  const address=request.headers.get('x-nf-client-connection-ip')||'';
  return keyedDigest(token,'rate-limit',isIP(address)?address:'unknown');
}
