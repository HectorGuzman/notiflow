/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === 'true';
const isCustomDomain = process.env.CUSTOM_DOMAIN === 'true';
const repoName = 'notiflow';

const nextConfig = {
  output: 'export',
  // Para custom domain en GitHub Pages no usamos basePath/assetPrefix
  basePath: isGithubPages && !isCustomDomain ? `/${repoName}` : '',
  assetPrefix: isGithubPages && !isCustomDomain ? `/${repoName}` : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  staticPageGenerationTimeout: 120,
};

module.exports = nextConfig;
