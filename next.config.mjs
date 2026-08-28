/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Higgsfield CDN. Lets /_next/image downscale generated model frames, which
    // arrive at 1536x2752 and are far too heavy for next/og to rasterise.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd8j0ntlcm91z4.cloudfront.net',
      },
    ],
  },
};

export default nextConfig;
