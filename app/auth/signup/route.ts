import {verifySignupChallenge} from '@/lib/signup-challenge';
import {cookies} from 'next/headers';
import {proxyBackend} from '@/lib/backend-proxy';
import {validateAccountConsent} from '@/lib/policy';
import {serverAuth} from '@/lib/supabase/server';
import {safeNext} from '@/lib/supabase/config';
import {signupBrowserCookie} from '@/lib/supabase/email-token';

const headers={'Cache-Control':'no-store'};
const reply=(body:object,status=200)=>Response.json(body,{status,headers});

export async function POST(request:Request) {
  const origin=request.headers.get('origin');
  const host=request.headers.get('host')||new URL(request.url).host;
  try {
    const source=new URL(origin||'');
    if(!['http:','https:'].includes(source.protocol)||source.host!==host)return reply({error:'Forbidden'},403);
  } catch {return reply({error:'Forbidden'},403)}
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'Invalid request.'},400);
  if(Number(request.headers.get('content-length'))>4096)return reply({error:'Request too large.'},413);
  let input;
  try {
    const body=await request.text();
    if(body.length>4096)return reply({error:'Request too large.'},413);
    input=JSON.parse(body);
    validateAccountConsent(input.consent);
  } catch {return reply({code:'signup_consent',error:'Accept the account terms and provide the required consent.'},400)}
  const {email,password,name,consent,next}=input;
  if(typeof email!=='string'||!email.trim()||email.length>254||typeof password!=='string'||password.length<12||password.length>128||typeof name!=='string'||name.trim().length<2||name.trim().length>40)
    return reply({code:'signup_fields',error:'Enter a nickname, email and password of at least 12 characters.'},400);
  const proof=await verifySignupChallenge(input.altcha);
  if(!proof)return reply({code:'captcha',error:'Complete verification again.'},400);
  const guard=await proxyBackend(new Request(request.url,{method:'POST',headers:{'x-nf-client-connection-ip':request.headers.get('x-nf-client-connection-ip')||'','content-type':'application/json'},body:JSON.stringify({email:email.trim()})}),'signup-guard',proof);
  if(!guard.ok)return guard;
  const {ticket}=await guard.json();
  if(typeof ticket!=='string'||ticket.length!==36)return reply({code:'network',error:'Signup verification unavailable.'},503);
  const client=await serverAuth();
  if(!client)return reply({code:'network',error:'Sign-up is temporarily unavailable.'},503);
  const destination=safeNext(typeof next==='string'?next:null);
  const callback=new URL('/auth/callback',origin!);
  callback.searchParams.set('next',destination);
  const {data,error}=await client.auth.signUp({
    email:email.trim(),password,
    options:{data:{full_name:name.trim(),hikmah_signup_ticket:ticket},emailRedirectTo:callback.toString()},
  });
  if(error)return reply({code:error.code,error:error.message},error.status||400);
  // Supabase may return an obfuscated user on a duplicate signup. Only a real
  // new email identity can create an attestation or mark this browser.
  const user=data.user;
  if(user?.identities?.length&&(!user.email_confirmed_at||data.session)) {
    const stored=await proxyBackend(new Request(origin+'/auth/signup',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({authUserId:user.id,consent}),
    }),'signup-consent');
    if(!stored.ok)console.error('Hikmah signup consent could not be recorded',{status:stored.status});
    if(!data.session){
      const jar=await cookies();
      jar.set(signupBrowserCookie,JSON.stringify({userId:user.id,next:destination.length<=1500?destination:'/'}),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:86400});
    }
  }
  // The same response for duplicates avoids revealing registered addresses.
  return reply({signedIn:!!data.session});
}
