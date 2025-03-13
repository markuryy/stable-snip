import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["png-chunks-extract", "png-chunks-encode", "png-chunk-text"],
  
  webpack: (config) => {
    // This is to support native Node.js modules and older packages that depend on them
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      stream: false,
    };
    
    return config;
  },
};

export default nextConfig;
