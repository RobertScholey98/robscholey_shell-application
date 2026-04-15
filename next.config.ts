import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@robscholey/shell-kit'],
  allowedDevOrigins: ['192.168.1.198'],
};

export default nextConfig;
