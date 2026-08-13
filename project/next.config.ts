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
  // Avoid pulling server-only modules into client accidentally via wrong imports.
  // pdfkit MUST be external — bundling breaks AFM font paths (ENOENT C:\ROOT\...).
  serverExternalPackages: [
    "mongoose",
    "mongodb",
    "pdfkit",
    "fontkit",
    "linebreak",
    "png-js",
    "jay-peg",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Legacy assets (existing files left as-is)
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Supabase storage (project ref subdomain)
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/**",
      },
    ],
  },
};

export default nextConfig;
