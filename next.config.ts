import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle, which is what the Docker runner
  // stage copies. Without it the image would need all of node_modules.
  output: "standalone",
  // Local development is commonly opened through either hostname. Allowing
  // both keeps HMR/client chunks available, which the scroll hero requires.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https:; connect-src 'self' https:; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
    ] }];
  },
};

export default nextConfig;
