/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'mediasoftbd.com' },
      { protocol: 'https', hostname: 'pps.whatsapp.net' },
    ],
  },
};

module.exports = nextConfig;
