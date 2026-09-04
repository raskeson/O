/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 部署時不要因為 lint 警告卡住 build
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
