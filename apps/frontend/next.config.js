const fs   = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

/** Build estático para GitHub Pages (workflow `github-pages.yml`). */
const isGitHubPages = process.env.GITHUB_PAGES === '1';
const repoSlug = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'pos-melania';
const basePath = isGitHubPages ? `/${repoSlug}` : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isGitHubPages
    ? {
        output: 'export',
        basePath,
        assetPrefix: `${basePath}/`,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        output: 'standalone',
        outputFileTracingRoot: path.join(__dirname, '../../'),
      }),
  env: {
    ...(isGitHubPages
      ? {
          NEXT_PUBLIC_STATIC_SITE: '1',
          NEXT_PUBLIC_BASE_PATH: basePath,
        }
      : {}),
    NEXT_PUBLIC_APP_VERSION: pkg.version ?? '1.0.0',
    // Contacto del vendedor del sistema (landing page → modal de planes)
    // Cambia estos valores y rebuilda la imagen para actualizar.
    NEXT_PUBLIC_CONTACT_EMAIL:     process.env.NEXT_PUBLIC_CONTACT_EMAIL     ?? 'ventas@gmail.com',
    NEXT_PUBLIC_CONTACT_WHATSAPP:  process.env.NEXT_PUBLIC_CONTACT_WHATSAPP  ?? '8299296616',
  },
  reactStrictMode: true,
  images: isGitHubPages
    ? { unoptimized: true }
    : {
        remotePatterns: [
          { protocol: 'http', hostname: 'localhost' },
          { protocol: 'https', hostname: 'localhost' },
        ],
      },
};

module.exports = nextConfig;
