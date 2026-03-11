const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
    // Next 14 expects this under experimental; keeps pdfjs-dist out of webpack server bundles.
    serverComponentsExternalPackages: ['pdfjs-dist'],
  },
  transpilePackages: ['@bite/ui', '@bite/types'],
}

module.exports = nextConfig
