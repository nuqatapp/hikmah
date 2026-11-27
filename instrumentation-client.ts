import * as Sentry from '@sentry/nextjs';
import {onBackendVersion} from '@/lib/monitoring/backend-version';
import {monitoringOptions} from '@/lib/monitoring/options';
import {scrubEvent} from '@/lib/monitoring/scrub.mjs';

const options=monitoringOptions('browser');
if(options.enabled){
  Sentry.init({
    ...options,
    // Reports go to this site's own relay, never straight to Sentry: see app/api/monitoring/route.ts.
    tunnel:'/api/monitoring',
    // Sentry reads browser and operating system from this one header. With header
    // collection off and the relay in between, it has to be set on the event itself.
    beforeSend:event=>scrubEvent({...event,request:{...event.request,headers:{'User-Agent':navigator.userAgent}}}),
    // Session Replay and User Feedback are never added. Session counting, DOM
    // click trails and console capture are removed: they can carry on-screen
    // names. What remains is the error, its stack and scrubbed navigation/fetch URLs.
    integrations:defaults=>[
      ...defaults.filter(integration=>!['BrowserSession','Breadcrumbs','ConsoleBreadcrumbs','Console'].includes(integration.name)),
      Sentry.breadcrumbsIntegration({dom:false,sentry:false}),
    ],
  });
  onBackendVersion(version=>Sentry.setTag('backend_version',version));
}

export const onRouterTransitionStart=options.enabled?Sentry.captureRouterTransitionStart:undefined;
