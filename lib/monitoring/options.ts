import {parseDsn} from './reporter.mjs';
import {scrubBreadcrumb,scrubEvent} from './scrub.mjs';

// @sentry/nextjs v11 removed sendDefaultPii and collects every category unless
// told otherwise. Each category is switched off here; this is the v11
// equivalent of sendDefaultPii: false, and stricter than the v10 default.
const dataCollection={
  userInfo:false,cookies:false,httpHeaders:false,httpBodies:[],urlQueryParams:false,
  graphQL:{document:false,variables:false},genAI:{inputs:false,outputs:false},mcp:{inputs:false,outputs:false},
  databaseQueryData:false,queues:false,stackFrameVariables:false,
};

export function monitoringDsn(){
  // NEXT_PUBLIC_SENTRY_DSN is inlined for the browser; the same project receives server events.
  return parseDsn(process.env.NEXT_PUBLIC_SENTRY_DSN)?.dsn;
}

export function monitoringOptions(surface:'browser'|'next-server'|'next-edge'){
  const dsn=monitoringDsn();
  return {
    dsn,
    enabled:!!dsn,
    environment:process.env.NEXT_PUBLIC_HIKMAH_ENVIRONMENT||'development',
    dataCollection,
    // Errors only. tracesSampleRate stays undefined: defining it, even as 0,
    // turns on trace headers for outgoing requests. No logs, replay or feedback.
    enableLogs:false,
    tracePropagationTargets:[],
    maxBreadcrumbs:30,
    // backend_version is set by the onBackendVersion listener after init. A tag
    // in initialScope would sit on the current scope and mask later updates.
    initialScope:{tags:{surface}},
    beforeSend:(event:unknown)=>scrubEvent(event),
    beforeBreadcrumb:(crumb:unknown)=>scrubBreadcrumb(crumb),
  };
}
