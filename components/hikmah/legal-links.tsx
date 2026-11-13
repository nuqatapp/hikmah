'use client';
import Link from 'next/link';
import {POLICY_LINKS} from '@/lib/site-info';

export function LegalLinks({arabic=false}:{arabic?:boolean}) {
  return <nav className="legal-links" aria-label={arabic?'المعلومات القانونية':'Legal information'}>
    {POLICY_LINKS.map(([href,en,ar])=><Link key={href} href={href}>{arabic?ar:en}</Link>)}
  </nav>;
}
