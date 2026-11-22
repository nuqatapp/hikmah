'use client';
import {usePathname,useSearchParams} from 'next/navigation';
import type {ComponentProps} from 'react';
export function SignInLink(props:Omit<ComponentProps<'a'>,'href'>){
  const path=usePathname();
  const search=useSearchParams().toString();
  const next=path+(search?'?'+search:'');
  return <a {...props} href={'/login?next='+encodeURIComponent(next)} onClick={event=>{
    event.currentTarget.href='/login?next='+encodeURIComponent(location.pathname+location.search+location.hash);
  }}/>;
}
