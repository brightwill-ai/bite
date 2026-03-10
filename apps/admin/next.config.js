const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@bite/ui', '@bite/types'],
  // Load pdfjs-dist via native require in Node.js — never bundle it through webpack
  serverExternalPackages: ['pdfjs-dist'],
}

module.exports = nextConfig
