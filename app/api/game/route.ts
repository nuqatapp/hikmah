import {proxyBackend} from '@/lib/backend-proxy';
import {getCurrentUser} from '@/lib/auth';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(new URL(request.url).searchParams.get('action')!=='export')return proxyBackend(request,'game');
 const user=await getCurrentUser();
 if(!user)return Response.json({error:'Sign in to export your data.'},{status:401});
 const response=await proxyBackend(request,'game');
 if(!response.ok)return response;
 return Response.json({...await response.json(),identity:{id:user.authUserId,email:user.email,nickname:user.displayName}},{headers:{'Cache-Control':'private, no-store','Content-Disposition':'attachment; filename="hikmah-data.json"','X-Content-Type-Options':'nosniff'}});
}
export const POST=(request:Request)=>proxyBackend(request,'game');
