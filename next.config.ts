import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{source:'/assets/fonts/:font*.woff2',headers:[{key:'Cache-Control',value:'public, max-age=604800'}]}];
  },
  async redirects() {
    return [
      {source: '/signin-with-chatgpt', destination: '/login', permanent: false},
      {source: '/signout-with-chatgpt', destination: '/settings', permanent: false},
    ];
  },
};

export default nextConfig;
