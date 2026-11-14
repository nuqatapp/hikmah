import type {Metadata} from 'next';
import {EmailConfirmation} from '@/components/hikmah/email-confirmation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title:'Confirm email | Hikmah',referrer:'no-referrer',robots:{index:false,follow:false}};

export default async function ConfirmEmail({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const token=typeof params.token_hash==='string'&&/^[a-f0-9]{40,128}$/.test(params.token_hash)?params.token_hash:'';
  const type=params.type==='email'||params.type==='recovery'?params.type:'';
  // Opening an email or a link scanner must not consume the one-time token.
  return <EmailConfirmation token={token} type={type}/>;
}
