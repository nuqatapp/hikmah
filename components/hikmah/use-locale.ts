'use client';
import {createContext,createElement,useContext,useEffect,useState,type ReactNode} from 'react';
import type {Locale} from '@/lib/game/rules';

export function readPreference(key:string,fallback:string){try{return localStorage.getItem(key)||fallback}catch{return fallback}}
export function writePreference(key:string,value:string){try{localStorage.setItem(key,value)}catch{}}
type Theme='light'|'dark';
type Preferences={locale:Locale;dark:boolean;setLocale:(v:Locale)=>void;setDark:(v:boolean)=>void};
const Context=createContext<Preferences|null>(null);

function persist(key:string,value:string){
  document.cookie=key+'='+value+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');
  writePreference(key,value);
}

export function UiPreferences({initialLocale,initialTheme,children}:{initialLocale:Locale;initialTheme:Theme;children:ReactNode}){
  const [locale,updateLocale]=useState(initialLocale);
  const [dark,updateDark]=useState(initialTheme==='dark');
  function applyLocale(value:Locale){
    document.documentElement.lang=value;
    document.documentElement.dir=value==='ar'?'rtl':'ltr';
    updateLocale(value);
  }
  function setLocale(value:Locale){
    persist('hikmah_ui',value);
    if(new URLSearchParams(location.search).has('lang')){
      const url=new URL(location.href);url.searchParams.set('lang',value);history.replaceState(history.state,'',url);
    }
    applyLocale(value);
  }
  function setDark(value:boolean){
    persist('hikmah_theme',value?'dark':'light');
    document.documentElement.classList.toggle('dark',value);
    updateDark(value);
  }
  useEffect(()=>{
    const hasCookie=(key:string)=>document.cookie.split(';').some(c=>c.trim().startsWith(key+'='));
    const legacy=readPreference('hikmah_ui','');
    if(!hasCookie('hikmah_ui')&&!new URLSearchParams(location.search).has('lang')&&(legacy==='en'||legacy==='ar'))setLocale(legacy);
    if(!hasCookie('hikmah_theme')){
      const saved=readPreference('hikmah_theme','');
      if(saved==='dark'||saved==='light')setDark(saved==='dark');
    }
    function sync(event:StorageEvent){
      if(event.key==='hikmah_ui'&&(event.newValue==='ar'||event.newValue==='en'))setLocale(event.newValue);
      if(event.key==='hikmah_theme'&&(event.newValue==='light'||event.newValue==='dark'))setDark(event.newValue==='dark');
    }
    window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
  },[]);
  return createElement(Context.Provider,{value:{locale,setLocale,dark,setDark}},children);
}
export function useUiLocale(){
  const context=useContext(Context);
  if(!context)throw new Error('UiPreferences provider is required.');
  return context;
}
