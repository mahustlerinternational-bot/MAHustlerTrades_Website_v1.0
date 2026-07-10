/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol:'https', hostname:'*.supabase.co' },
      { protocol:'https', hostname:'*.supabase.in' },
      { protocol:'http',  hostname:'*' },
      { protocol:'https', hostname:'*' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3010',
        '127.0.0.1:3010',
        '192.168.2.10:3010',
        process.env.NEXT_PUBLIC_APP_URL?.replace(/https?:\/\//,'') ?? '',
      ].filter(Boolean),
    },
  },
};
module.exports = nextConfig;
