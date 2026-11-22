import type {MetadataRoute} from 'next';
import {publicPages,siteUrl} from '@/lib/site-metadata';
export default function sitemap():MetadataRoute.Sitemap{
  return publicPages.flatMap(path=>{
    const url=siteUrl+path;
    const languages={ar:url+'?lang=ar',en:url+'?lang=en','x-default':url};
    return [url,languages.ar,languages.en].map(address=>({url:address,alternates:{languages}}));
  });
}
