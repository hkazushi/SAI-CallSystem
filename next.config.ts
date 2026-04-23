import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse / mammoth / pdfjs-dist are Node-only CommonJS libs.
  // Externalize them so Next.js' page-data collection phase does not
  // try to bundle/evaluate them (avoids DOMMatrix / canvas polyfill errors).
  serverExternalPackages: ["pdf-parse", "mammoth", "pdfjs-dist"],
};

export default nextConfig;
