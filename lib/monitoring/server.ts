import 'server-only';
import * as Sentry from '@sentry/nextjs';

type Detail={tags?:Record<string,string>;fingerprint?:string[];level?:'error'|'warning'};
// Handled server failures. Tags must be fixed vocabulary: never player data.
// Serverless instances can freeze after the response, so the report is flushed first.
export async function reportServerFailure(error:unknown,detail:Detail={}) {
  try{
    if(!Sentry.getClient())return;
    Sentry.withScope(scope=>{
      for(const [key,value] of Object.entries(detail.tags||{}))scope.setTag(key,value);
      if(detail.fingerprint)scope.setFingerprint(detail.fingerprint);
      scope.setLevel(detail.level||'error');
      Sentry.captureException(error);
    });
    await Sentry.flush(2000);
  }catch{}
}
