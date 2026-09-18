import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      {source: '/signin-with-chatgpt', destination: '/login', permanent: false},
      {source: '/signout-with-chatgpt', destination: '/settings', permanent: false},
    ];
  },
};

export default nextConfig;
