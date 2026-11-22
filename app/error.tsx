'use client';
import {StatusPage} from '@/components/hikmah/status-page';
export default function ErrorPage({reset}:{reset:()=>void}){return <StatusPage retry={reset}/>;}
