import {serverAuth} from '@/lib/supabase/server';
import {cookies} from 'next/headers';
import {createClient} from '@supabase/supabase-js';
import {authConfig,safeNext} from '@/lib/supabase/config';
import {noteAuthFailure} from '@/lib/monitoring/health';
import {readSignupMarker,signupBrowserCookie,validEmailTokenHash} from '@/lib/supabase/email-token';

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
    const jar=await cookies();
    const marker=readSignupMarker(jar.get(signupBrowserCookie)?.value);
    let verifiedUserId:string|undefined;
    if(form.get('automatic')==='1'){
      const expected=marker?.userId;
      const config=authConfig();
      if(type!=='email'||!expected||!config)return fail();
      // Verify in an isolated client. A token for a different account must
      // never replace this browser's session during automatic confirmation.
      const verifier=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      const {data,error}=await verifier.auth.verifyOtp({token_hash:token,type});
      if(error||!data.session||data.user?.id!==expected){await noteAuthFailure('confirm_failed',new URL(request.url).origin);return fail()}
      const {error:sessionError}=await client.auth.setSession(data.session);
      if(sessionError)return fail();
      verifiedUserId=data.user.id;
    }else{
      const {data,error}=await client.auth.verifyOtp({token_hash:token,type});
      if(error){await noteAuthFailure('confirm_failed',new URL(request.url).origin);return fail()}
      verifiedUserId=data.user?.id;
    }
    if(type==='email'&&jar.has(signupBrowserCookie))jar.set(signupBrowserCookie,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
    const next=marker&&verifiedUserId===marker.userId?safeNext(marker.next):'/';
    return new Response(null,{status:303,headers:{...headers,Location:type==='recovery'?'/reset-password':next}});
  }catch{return fail()}
}
