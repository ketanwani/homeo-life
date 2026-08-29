import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  // bcryptjs (used by auth.ts on every login) is dual ESM/CJS-exported in a way Next's output file
  // tracer fails to resolve automatically -- it silently drops from .next/standalone/node_modules,
  // so every login attempt in the standalone build throws "Cannot find module 'bcryptjs'" at
  // runtime. Force it into every traced route's bundle.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/bcryptjs/**"]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  }
};

export default nextConfig;
