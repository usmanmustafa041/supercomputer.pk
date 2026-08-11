import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle, which is what the Docker runner
  // stage copies. Without it the image would need all of node_modules.
  output: "standalone",
  /* config options here */
};

export default nextConfig;
