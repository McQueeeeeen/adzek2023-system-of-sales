/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // CI/Vercel: lint is executed separately in the workflow.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporary release safeguard for Vercel environment drift.
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig
