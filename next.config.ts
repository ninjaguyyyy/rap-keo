import type { NextConfig } from "next";

// Next.js App Router mặc định đã serve /public/* và tối ưu qua Image.
// Cho phép tối ưu ảnh ngoài domain Supabase Storage (cover đội upload lên
// bucket team-assets). Hostname wildcard theo project ref (sebsumdlbiprbdchvxmd...).
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
