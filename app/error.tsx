'use client';
import * as Sentry from '@sentry/nextjs';
import {useEffect} from 'react';
import {StatusPage} from '@/components/hikmah/status-page';
export default function ErrorPage({error,reset}:{error:unknown;reset:()=>void}){
  // Rendering errors caught by this boundary never reach the global handlers.
  useEffect(()=>{Sentry.captureException(error)},[error]);
  return <StatusPage retry={reset}/>;
}
