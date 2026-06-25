import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/queries", "@repo/auth", "@repo/i18n"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9000",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
