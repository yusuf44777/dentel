import type { NextConfig } from "next";

const HF_SPACE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

// connect-src: kendi origin + HF Space backend
const connectSrc = ["'self'", HF_SPACE, "http://localhost:7860"]
  .filter(Boolean)
  .join(" ");

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,  // Next.js runtime için gerekli
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src ${connectSrc}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy",       value: CSP },
  { key: "X-Frame-Options",               value: "DENY" },
  { key: "X-Content-Type-Options",        value: "nosniff" },
  { key: "X-XSS-Protection",              value: "1; mode=block" },
  { key: "Referrer-Policy",               value: "no-referrer" },
  { key: "Permissions-Policy",            value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security",     value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy",    value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy",  value: "same-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/downloads/:file*",
        headers: [{ key: "Content-Disposition", value: "attachment" }],
      },
    ];
  },
};

export default nextConfig;
