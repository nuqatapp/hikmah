import {pageTitles,publicPages,siteUrl} from '@/lib/site-metadata';
import type {Metadata} from 'next';
import {cookies,headers} from 'next/headers';
import {UiPreferences} from '@/components/hikmah/use-locale';
import {preferredLocale} from '@/lib/ui-preferences';
import './globals.css';
import './playful.css';

async function preferences(){
  const [jar,request]=await Promise.all([cookies(),headers()]);
  const explicit=request.get('x-hikmah-language');
  const locale=preferredLocale(explicit||jar.get('hikmah_ui')?.value,request.get('accept-language'));
  const theme:'light'|'dark'=jar.get('hikmah_theme')?.value==='dark'?'dark':'light';
  return {locale,theme,explicit,path:request.get('x-hikmah-path')} as const;
}
export async function generateMetadata():Promise<Metadata>{
  const {locale,explicit,path}=await preferences();
  const url=path&&publicPages.some(page=>page===path)?siteUrl+path:null;
  const title=(path&&pageTitles[path]?.[locale==='ar'?1:0]||'Hikmah')+' | '+(locale==='ar'?'حكمة':'Hikmah');
  const description=locale==='ar'?'قليل من الحكمة، كل يوم. العب الحروف الناقصة والاختيار المتعدد والشفرة بالعربية أو الإنجليزية، بمفردك أو مع أصدقائك.':'A little wisdom, every day. Play Missing Letters, Multiple Choice and Cryptogram in Arabic or English, solo or with friends.';
  return {title,description,metadataBase:new URL(siteUrl),manifest:'/manifest.webmanifest',
    openGraph:{title,description,type:'website',siteName:'Hikmah | حكمة',locale:locale==='ar'?'ar_SA':'en_US',url:url||siteUrl,images:[{url:'/share.png',width:1200,height:630,alt:'Hikmah | حكمة'}]},
    twitter:{card:'summary_large_image',title,description,images:['/share.png']},
    ...(!url&&{robots:{index:false,follow:false}}),
    icons:{icon:'/favicon.ico',shortcut:'/favicon.ico'},
    ...(url&&{alternates:{canonical:explicit?url+'?lang='+explicit:url,languages:{ar:url+'?lang=ar',en:url+'?lang=en','x-default':url}}})};
}
export default async function RootLayout({children}:{children:React.ReactNode}){
  const {locale,theme}=await preferences();
  return <html lang={locale} dir={locale==='ar'?'rtl':'ltr'} className={theme==='dark'?'dark':undefined}>
    <body><UiPreferences initialLocale={locale} initialTheme={theme}>{children}</UiPreferences></body>
  </html>;
}
