import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@robscholey/shell-kit'],
  allowedDevOrigins: ['192.168.1.198'],
};

export default nextConfig;
