const fs   = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version ?? '1.0.0',
    // Contacto del vendedor del sistema (landing page → modal de planes)
    // Cambia estos valores y rebuilda la imagen para actualizar.
    NEXT_PUBLIC_CONTACT_EMAIL:     process.env.NEXT_PUBLIC_CONTACT_EMAIL     ?? 'ventas@gmail.com',
    NEXT_PUBLIC_CONTACT_WHATSAPP:  process.env.NEXT_PUBLIC_CONTACT_WHATSAPP  ?? '8299296616',
  },
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'https', hostname: 'localhost' },
    ],
  },
};

module.exports = nextConfig;
