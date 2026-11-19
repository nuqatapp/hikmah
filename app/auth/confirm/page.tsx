import type {Metadata} from 'next';
import {EmailConfirmation} from '@/components/hikmah/email-confirmation';
import {cookies,headers} from 'next/headers';
import {signupBrowserCookie,validEmailTokenHash} from '@/lib/supabase/email-token';

export const dynamic = 'force-dynamic';
// Native POST forms need their Origin for CSRF checks. strict-origin omits the
// entire path/query (including the token) without turning that Origin into null.
export const metadata: Metadata = {title:'Confirm email | Hikmah',referrer:'strict-origin',robots:{index:false,follow:false}};

export default async function ConfirmEmail({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const token=validEmailTokenHash(params.token_hash)?params.token_hash:'';
  const type=params.type==='email'||params.type==='recovery'?params.type:'';
  // Automatic submission needs both a user-activated browser navigation
  // and the HttpOnly marker issued by a signup in this browser.
  const automatic=type==='email'&&(await headers()).get('sec-fetch-user')==='?1'&&(await cookies()).has(signupBrowserCookie);
  return <EmailConfirmation token={token} type={type} automatic={automatic}/>;
}
