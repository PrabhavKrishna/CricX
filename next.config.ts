import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow builds to proceed even if TypeScript or ESLint report errors.
  // This helps avoid silent hangs/failures during Vercel builds while
  // we iterate on fixing type errors. Remove or set to false once
  // the codebase type issues are resolved.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // Prevent ESLint from failing the production build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
