import {env} from 'node:process';
import {createReporter} from '../lib/monitoring/reporter.mjs';
import {BACKEND_VERSION} from './version';

// SENTRY_DSN is a Supabase function secret. Without it, or with a DSN outside
// the EU (Germany) region, reporting stays off and the backend behaves as before.
const reporter=createReporter({dsn:env.SENTRY_DSN,surface:'edge-function',release:'hikmah-api@'+BACKEND_VERSION,environment:env.HIKMAH_ENVIRONMENT||'production'});

// Tags are fixed vocabulary only. Never pass identifiers, answers, names or request data.
export function reportBackendFailure(error:unknown,tags:Record<string,string|undefined>={}) {
  return reporter.report(error,{tags:{...tags,backend_version:BACKEND_VERSION}});
}
