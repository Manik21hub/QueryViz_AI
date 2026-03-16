/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      // "beforeFiles" rewrites happen BEFORE checking the filesystem (pages/api).
      // "afterFiles" rewrites happen AFTER, so pages/api/upload.js takes priority.
      afterFiles: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;
