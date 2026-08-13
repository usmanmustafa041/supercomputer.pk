import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle, which is what the Docker runner
  // stage copies. Without it the image would need all of node_modules.
  output: "standalone",
  // The workspace root, so the standalone trace follows @supercomputers/shared
  // out of this directory instead of stopping at it.
  outputFileTracingRoot: path.join(__dirname, ".."),
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    }];
  },
  transpilePackages: ["@supercomputers/shared"],
  experimental: {
    serverActions: {
      // Product photographs are posted through a Server Action, and the default
      // ceiling on an action body is 1MB. A single photo may be 8MB and an
      // administrator can send several at once, so this has to clear the sum of
      // them plus the multipart overhead. The per-file limit is enforced by the
      // API, which can explain itself; this one just fails.
      bodySizeLimit: "56mb",
    },
  },
};

export default nextConfig;
