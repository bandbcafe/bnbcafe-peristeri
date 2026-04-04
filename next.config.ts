/** @type {import('next').NextConfig} */
const config = {
  basePath: "/peristeri",
  reactStrictMode: true,
  images: {
    domains: ["sweetleaf.gr"],
    unoptimized: true,
  },
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = config;
