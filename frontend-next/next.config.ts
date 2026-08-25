import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/', destination: '/home', permanent: false },
      { source: '/processing', destination: '/home', permanent: false },
      { source: '/verdict', destination: '/home', permanent: false },
      { source: '/results', destination: '/home', permanent: false },
      { source: '/audit', destination: '/home', permanent: false },
    ]
  },
};

export default nextConfig;
