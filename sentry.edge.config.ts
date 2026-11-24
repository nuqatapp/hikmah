import * as Sentry from '@sentry/nextjs';
import {onBackendVersion} from '@/lib/monitoring/backend-version';
import {monitoringOptions} from '@/lib/monitoring/options';

const options=monitoringOptions('next-edge');
if(options.enabled){
  Sentry.init(options);
  // The backend release is a property of the deployment, not of one request.
  onBackendVersion(version=>Sentry.getGlobalScope().setTag('backend_version',version));
}
