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
  const publicPages=['/','/leaderboard','/privacy','/terms','/contact','/cookies','/refunds','/licenses'];
  const url=path&&publicPages.includes(path)?'https://hikmahgame.com'+path:null;
  return {title:'Hikmah | حكمة',description:locale==='ar'?'قليل من الحكمة، كل يوم. العب الحروف الناقصة والاختيار المتعدد والشفرة بالعربية أو الإنجليزية، بمفردك أو مع أصدقائك.':'A little wisdom, every day. Play Missing Letters, Multiple Choice and Cryptogram in Arabic or English, solo or with friends.',
    icons:{icon:'/favicon.png',shortcut:'/favicon.png'},
    ...(url&&{alternates:{canonical:explicit?url+'?lang='+explicit:url,languages:{ar:url+'?lang=ar',en:url+'?lang=en','x-default':url}}})};
}
export default async function RootLayout({children}:{children:React.ReactNode}){
  const {locale,theme}=await preferences();
  return <html lang={locale} dir={locale==='ar'?'rtl':'ltr'} className={theme==='dark'?'dark':undefined}>
    <body><UiPreferences initialLocale={locale} initialTheme={theme}>{children}</UiPreferences></body>
  </html>;
}
