import {contentSecurityPolicy} from './lib/content-security';
import type { NextConfig } from "next";
import {withSentryConfig} from '@sentry/nextjs/config';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Netlify sets CONTEXT at build time (production, deploy-preview, branch-deploy).
  env: {NEXT_PUBLIC_HIKMAH_ENVIRONMENT: process.env.CONTEXT || 'development'},
  async headers() {
    return [{source:'/:path*',headers:[{key:'Content-Security-Policy',value:contentSecurityPolicy()},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Content-Type-Options',value:'nosniff'}]},{source:'/auth/callback',headers:[{key:'Referrer-Policy',value:'no-referrer'}]},{source:'/auth/confirm/verify',headers:[{key:'Referrer-Policy',value:'no-referrer'}]},{source:'/auth/confirm',headers:[{key:'Referrer-Policy',value:'strict-origin'}]},{source:'/assets/fonts/:font*.woff2',headers:[{key:'Cache-Control',value:'public, max-age=604800'}]}];
  },
  async redirects() {
    return [
      {source: '/signin-with-chatgpt', destination: '/login', permanent: false},
      {source: '/signout-with-chatgpt', destination: '/settings', permanent: false},
    ];
  },
};

// Readable stack traces need source maps. They are uploaded only when the build
// has all three values; SENTRY_AUTH_TOKEN is a build-only secret, never public.
const upload=!!(process.env.SENTRY_AUTH_TOKEN&&process.env.SENTRY_ORG&&process.env.SENTRY_PROJECT);
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {disable: !upload, deleteSourcemapsAfterUpload: true},
  silent: !process.env.CI,
  telemetry: false,
  bundleSizeOptimizations: {excludeTracing: true, excludeReplayIframe: true, excludeReplayShadowDom: true, excludeReplayWorker: true},
});
