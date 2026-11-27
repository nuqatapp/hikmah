'use client';
import Link from 'next/link';
import {useUiLocale} from './use-locale';

export function StatusPage({retry}:{retry?:()=>void}){
  const {locale}=useUiLocale();
  const t=(en:string,ar:string)=>locale==='ar'?ar:en;
  return <main className="main play-wrap"><section className="panel stack">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="brand-symbol" src="/brand/hikmah_symbol_color.svg" width={97} height={100} alt="" aria-hidden="true"/>
    <h1>{retry?t('Something went wrong','حدث خطأ'):t('Page not found','الصفحة غير موجودة')}</h1>
    <p>{retry?t('Try opening this page again.','حاول فتح هذه الصفحة مجددًا.'):t('This page may have moved or the link may be out of date.','ربما نُقلت الصفحة أو انتهت صلاحية الرابط.')}</p>
    <div className="flex-row">{retry&&<button className="btn" onClick={retry}>{t('Try again','حاول مجددًا')}</button>}<Link className="btn outline" href="/">{t('Back to the games','العودة إلى الألعاب')}</Link></div>
  </section></main>;
}
