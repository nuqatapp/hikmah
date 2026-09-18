import Hikmah from '@/app/hikmah';
import {getCurrentUser} from '@/lib/auth';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getCurrentUser();return <Hikmah view='leaderboard' signedInitially={!!user}/>;}
