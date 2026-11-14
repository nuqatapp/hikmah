'use client';
import Link from 'next/link';
import {LEGAL_CONTENT,type LegalPageId} from '@/lib/legal-content';
import {SITE_INFO} from '@/lib/site-info';
import {LegalLinks} from './legal-links';
import {useUiLocale} from './use-locale';

export function LegalPage({page}:{page:LegalPageId}) {
 const {locale,setLocale}=useUiLocale(),ar=locale==='ar',index=ar?1:0,content=LEGAL_CONTENT[page];
 return <div className="shell" lang={locale} dir={ar?'rtl':'ltr'}>
  <header className="legal-header"><Link href="/" className="brand">Hikmah / حكمة</Link><button className="btn outline" onClick={()=>setLocale(ar?'en':'ar')}>{ar?'English':'العربية'}</button></header>
  <main className="main legal-document"><p className="eyebrow">{ar?'آخر تحديث':'Updated'} {SITE_INFO.policyVersion}</p><h1>{content.title[index]}</h1><p>{content.intro[index]}</p>
   {content.sections.map((section,i)=><section key={i} className="stack"><h2>{section.heading[index]}</h2><p>{section.body[index]}</p></section>)}
   <section className="panel stack"><h2>{ar?'بيانات المشغّل':'Operator details'}</h2><p>{SITE_INFO.operator}</p><p><a href={'mailto:'+SITE_INFO.email}>{SITE_INFO.email}</a></p><p><a href={SITE_INFO.origin}>{SITE_INFO.origin}</a></p>{SITE_INFO.address&&<p>{SITE_INFO.address}</p>}{SITE_INFO.registration&&<p>{ar?'بيانات التسجيل: ':'Registration: '}{SITE_INFO.registration}</p>}</section>
   {page==='contact'&&<a className="btn" href={'mailto:'+SITE_INFO.email+'?subject=Hikmah%20privacy%20request'}>{ar?'إرسال طلب بالبريد':'Email a request'}</a>}
   {page==='licenses'&&<a href="/third-party-notices.txt">{ar?'إشعارات وتراخيص البرمجيات الخارجية':'Full third-party software notices'}</a>}
   <Link className="back-link" href="/">{ar?'العودة إلى اللعبة':'Back to the game'}</Link>
  </main><footer className="footer"><LegalLinks arabic={ar}/></footer>
 </div>;
}
