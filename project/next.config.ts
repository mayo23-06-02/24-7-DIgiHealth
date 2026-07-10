import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Faster cold loads: tree-shake large icon/chart packages
  experimental: {
    optimizePackageImports: [
      "react-icons",
      "react-icons/bi",
      "react-icons/fa",
      "lucide-react",
      "chart.js",
    ],
  },
  // Avoid pulling server-only modules into client accidentally via wrong imports
  serverExternalPackages: ["mongoose", "mongodb"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
