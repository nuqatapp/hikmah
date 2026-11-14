import {serverAuth} from '@/lib/supabase/server';
import {validEmailTokenHash} from '@/lib/supabase/email-token';

export async function POST(request:Request) {
  const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
  const fail=()=>new Response(null,{status:303,headers:{...headers,Location:'/login?error=callback'}});
  const host=request.headers.get('host')||new URL(request.url).host;
  try {
    const origin=request.headers.get('origin');
    if(!origin||new URL(origin).host!==host)return new Response('Forbidden',{status:403,headers});
  }catch{return new Response('Forbidden',{status:403,headers})}
  if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return fail();
  if(Number(request.headers.get('content-length'))>4096)return new Response('Request too large',{status:413,headers});
  try {
    const body=await request.text();
    if(body.length>4096)return new Response('Request too large',{status:413,headers});
    const form=new URLSearchParams(body),token=form.get('token_hash')||'',type=form.get('type');
    if(!validEmailTokenHash(token)||(type!=='email'&&type!=='recovery'))return fail();
    const client=await serverAuth();
    if(!client)return fail();
    const {error}=await client.auth.verifyOtp({token_hash:token,type});
    if(error)return fail();
    // Fixed local destinations: neither template parameters nor a POST can redirect externally.
    return new Response(null,{status:303,headers:{...headers,Location:type==='recovery'?'/reset-password':'/'}});
  }catch{return fail()}
}
