'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {SITE_INFO} from '@/lib/site-info';

export function StorageNotice({arabic=false}:{arabic?:boolean}) {
  const [visible,setVisible]=useState(false);
  useEffect(()=>{try{setVisible(localStorage.getItem('hikmah_storage_notice')!==SITE_INFO.policyVersion)}catch{setVisible(true)}},[]);
  if(!visible)return null;
  return <aside className="storage-notice" aria-label={arabic?'إشعار ملفات الارتباط':'Cookie information'}>
    <p>{arabic?'نستخدم ملفات ارتباط لازمة لتشغيل اللعبة وحفظ تفضيلاتك.':'We use essential cookies to run the game and save your preferences.'} <Link href="/cookies">{arabic?'التفاصيل':'Read the details'}</Link></p>
    <button type="button" className="btn outline" onClick={()=>{try{localStorage.setItem('hikmah_storage_notice',SITE_INFO.policyVersion)}catch{}setVisible(false)}}>{arabic?'فهمت':'Got it'}</button>
  </aside>;
}
