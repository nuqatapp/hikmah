'use client';
import {useEffect,useSyncExternalStore} from 'react';
import type {Locale} from '@/lib/game/rules';

export function readPreference(key:string,fallback:string){try{return localStorage.getItem(key)||fallback}catch{return fallback}}
export function writePreference(key:string,value:string){try{localStorage.setItem(key,value)}catch{}}

let cachedLocale:Locale|undefined;
function subscribe(notify:()=>void){const storage=()=>{cachedLocale=readPreference('hikmah_ui',cachedLocale||'en')==='ar'?'ar':'en';notify()};window.addEventListener('storage',storage);window.addEventListener('hikmah_locale_changed',notify);return()=>{window.removeEventListener('storage',storage);window.removeEventListener('hikmah_locale_changed',notify)}}
function currentLocale():Locale{return cachedLocale??=(readPreference('hikmah_ui','en')==='ar'?'ar':'en')}
const serverLocale=():Locale=>'en';
function setLocale(locale:Locale){cachedLocale=locale;writePreference('hikmah_ui',locale);window.dispatchEvent(new Event('hikmah_locale_changed'))}
export function useUiLocale() {
  const locale=useSyncExternalStore(subscribe,currentLocale,serverLocale);
  useEffect(()=>{document.documentElement.classList.toggle('dark',readPreference('hikmah_theme','light')==='dark')},[]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);
  return {locale, setLocale};
}
