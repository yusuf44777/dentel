import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow APK/IPA to be served from /public/downloads
  async headers() {
    return [
      {
        source: "/downloads/:file*",
        headers: [
          { key: "Content-Disposition", value: "attachment" },
        ],
      },
    ];
  },
};

export default nextConfig;
