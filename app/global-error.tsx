'use client';
import * as Sentry from '@sentry/nextjs';
import {useEffect} from 'react';

// Replaces the root layout when it fails, so it carries its own document.
export default function GlobalError({error,retry}:{error:unknown;retry:()=>void}){
  useEffect(()=>{Sentry.captureException(error)},[error]);
  return <html lang="en"><body style={{fontFamily:'system-ui,sans-serif',padding:32,textAlign:'center'}}>
    <h1>Hikmah / حكمة</h1>
    <p>Something went wrong. Please try again.</p>
    <p dir="rtl">حدث خطأ. حاول مرة أخرى.</p>
    <button type="button" onClick={()=>retry()}>Try again / إعادة المحاولة</button>
  </body></html>;
}
