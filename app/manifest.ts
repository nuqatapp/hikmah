import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{
  return {name:'Hikmah | حكمة',short_name:'Hikmah',start_url:'/',display:'standalone',background_color:'#f8f3ea',theme_color:'#f8f3ea',icons:[{src:'/favicon.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
}
