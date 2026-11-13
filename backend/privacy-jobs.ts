import {env} from 'node:process';
import {bucket,withDatabase,type createConnection} from '../db/raw';
import {one,many,run} from '../lib/game/service';

type Connection=ReturnType<typeof createConnection>;
export async function hasErasureJob(sql:Connection,authId:string) {
  return withDatabase(sql,()=>one('SELECT status FROM account_erasure_jobs WHERE auth_user_id=?',authId));
}
export async function finishErasure(sql:Connection,authId:string) {
  const job=await withDatabase(sql,()=>one('SELECT * FROM account_erasure_jobs WHERE auth_user_id=?',authId));
  if(!job||job.status==='completed')return true;
  let stage='storage_cleanup';
  try{
    // File deletion happens after the game-data transaction commits, with durable retry.
    if(job.avatar_path)await bucket().delete(job.avatar_path);
    stage='auth_cleanup';
    const base=env.SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY;
    if(!base||!key)throw new Error('Auth cleanup unavailable.');
    const response=await fetch(base+'/auth/v1/admin/users/'+encodeURIComponent(authId),{method:'DELETE',headers:{Authorization:'Bearer '+key,apikey:key,'Content-Type':'application/json'},body:JSON.stringify({should_soft_delete:false}),signal:AbortSignal.timeout(10_000)});
    if(!response.ok&&response.status!==404)throw new Error('Auth cleanup failed.');
    await withDatabase(sql,()=>run("UPDATE account_erasure_jobs SET status='completed',completed_at=?,avatar_path=NULL,last_error_code=NULL,attempts=attempts+1 WHERE auth_user_id=?",Date.now(),authId));
    return true;
  }catch{
    await withDatabase(sql,()=>run('UPDATE account_erasure_jobs SET attempts=attempts+1,last_error_code=? WHERE auth_user_id=?',stage,authId));
    return false;
  }
}
export async function runPrivacyMaintenance(sql:Connection) {
  const files=await withDatabase(sql,()=>many('SELECT path FROM storage_deletion_jobs ORDER BY requested_at LIMIT 20'));
  let filesCompleted=0;
  for(const file of files){
    try{await bucket().delete(file.path);await withDatabase(sql,()=>run('DELETE FROM storage_deletion_jobs WHERE path=?',file.path));filesCompleted++}
    catch{await withDatabase(sql,()=>run('UPDATE storage_deletion_jobs SET attempts=attempts+1 WHERE path=?',file.path))}
  }
  const jobs=await withDatabase(sql,()=>many("SELECT auth_user_id FROM account_erasure_jobs WHERE status='pending' ORDER BY requested_at LIMIT 20"));
  let completed=0;for(const job of jobs)if(await finishErasure(sql,job.auth_user_id))completed++;
  const cutoff=Date.now()-30*86400_000;
  await withDatabase(sql,async()=>{
    await run("DELETE FROM rooms WHERE host LIKE 'g_%' AND mode='solo' AND updated_at<? AND NOT EXISTS(SELECT 1 FROM rounds r JOIN attempts a ON a.round=r.id WHERE r.room=rooms.id AND a.created_at>=?)",cutoff,cutoff);
    await run("DELETE FROM attempts WHERE user LIKE 'g_%' AND created_at<?",cutoff);
    await run("DELETE FROM account_erasure_jobs WHERE status='completed' AND completed_at<?",cutoff);
  });
  return {ok:true,erasureJobsChecked:jobs.length,erasureJobsCompleted:completed,storageJobsChecked:files.length,storageJobsCompleted:filesCompleted};
}
