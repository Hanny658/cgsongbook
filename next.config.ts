import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained build in .next/standalone: the server only needs Node to run it
  // (built and shipped by .github/workflows/deploy.yml, no build on the server).
  output: "standalone",
};

export default nextConfig;
