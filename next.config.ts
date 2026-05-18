import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingExcludes: {
    '*': [
      'data.sql',
      'public/uploads/**/*',
      'public/cesium/**/*',
      '**/*.pdf',
      '**/*.rtf',
      'node_modules/@ffmpeg-installer/**/*'
    ]
  }
};

export default nextConfig;
