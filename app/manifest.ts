import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{
  return {name:'Hikmah | حكمة',short_name:'Hikmah',start_url:'/',display:'standalone',background_color:'#fff9e8',theme_color:'#fff9e8',icons:[{src:'/favicon.png',sizes:'any',type:'image/png'}]};
}
