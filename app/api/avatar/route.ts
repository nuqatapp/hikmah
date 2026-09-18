import {proxyBackend} from '@/lib/backend-proxy';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>proxyBackend(request,'avatar');
export const POST=(request:Request)=>proxyBackend(request,'avatar');
