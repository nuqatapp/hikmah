import Hikmah from '@/app/hikmah';
import {getCurrentUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
import {safeNext} from '@/lib/supabase/config';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams;
 // Some provider email templates return to Site URL rather than the callback.
 // Keep the same PKCE exchange and safe redirect validation for those links.
 if(typeof params.code==='string'&&params.code){
  const next=typeof params.next==='string'?safeNext(params.next):'/';
  redirect('/auth/callback?'+new URLSearchParams({code:params.code,next}));
 }
 if(typeof params.error==='string')redirect('/login?error=callback');
 const user=await getCurrentUser();return <Hikmah view='home' signedInitially={!!user}/>;
}
