/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  experimental: {
    // Flyer OCR runs on the server: keep tesseract as a real package and ship its worker + wasm files
    serverComponentsExternalPackages: ['tesseract.js', 'tesseract.js-core'],
    outputFileTracingIncludes: {
      '/api/events/read-flyers': ['./node_modules/tesseract.js/**/*', './node_modules/tesseract.js-core/**/*', './node_modules/bmp-js/**/*', './node_modules/is-url/**/*', './node_modules/node-fetch/**/*', './node_modules/regenerator-runtime/**/*', './node_modules/wasm-feature-detect/**/*', './node_modules/zlibjs/**/*', './node_modules/idb-keyval/**/*', './node_modules/opencollective-postinstall/**/*', './node_modules/is-electron/**/*', './node_modules/whatwg-url/**/*', './node_modules/tr46/**/*', './node_modules/webidl-conversions/**/*'],
    },
  },
};

export default nextConfig;
