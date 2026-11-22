'use client';
import {createElement,useEffect,useState} from 'react';
export function SignupCaptcha({arabic}:{arabic:boolean}){
  const [failed,setFailed]=useState(false);
  useEffect(()=>{import('altcha').then(()=>import('altcha/i18n/ar')).catch(()=>setFailed(true))},[]);
  if(failed)return <p role="alert">{arabic?'تعذّر تحميل التحقق. أعد تحميل الصفحة للمحاولة مجددًا.':'Verification could not load. Reload the page to try again.'}</p>;
  return createElement('altcha-widget',{challenge:'/auth/challenge',language:arabic?'ar':'en',name:'altcha'});
}
