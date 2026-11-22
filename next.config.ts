import {contentSecurityPolicy} from './lib/content-security';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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

export default nextConfig;
