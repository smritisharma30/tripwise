import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // chat-runtime ships TypeScript source (no build step), so Next compiles it.
  transpilePackages: ['@tripwise/chat-runtime'],
};

export default nextConfig;
