import * as Sentry from '@sentry/nextjs';
import {onBackendVersion} from '@/lib/monitoring/backend-version';
import {monitoringOptions} from '@/lib/monitoring/options';

const options=monitoringOptions('browser');
if(options.enabled){
  Sentry.init({
    ...options,
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
