'use client';
import Link from 'next/link';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import type {ComponentProps} from 'react';
export function SignInLink(props:Omit<ComponentProps<'a'>,'href'>){
  const router=useRouter();
  const path=usePathname();
  const search=useSearchParams().toString();
  const next=path+(search?'?'+search:'');
  return <Link {...props} target={undefined} href={'/login?next='+encodeURIComponent(next)} onNavigate={event=>{
    if(!location.hash)return;
    event.preventDefault();
    router.push('/login?next='+encodeURIComponent(location.pathname+location.search+location.hash));
  }}/>;
}
