import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow downloadable files to be served from /public/downloads
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
