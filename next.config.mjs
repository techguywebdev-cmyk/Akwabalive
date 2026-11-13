/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // Flyers and photos the share cards shrink before drawing
      ...['cdn-az.allevents.in', 'cdn.ayatickets.com', 'res.cloudinary.com', 'img.evbuc.com', 'egotickets-core-cdn.s3.eu-north-1.amazonaws.com',
        'images.squarespace-cdn.com', 'tsacoal.com', 'akwabalive.vercel.app', 'i.scdn.co', 'upload.wikimedia.org', 'i.ytimg.com']
        .map((hostname) => ({ protocol: 'https', hostname })),
    ],
  },
  experimental: {
    // Pages you've opened (and links prefetched in view) stay in memory: Back and re-opening are instant
    staleTimes: { dynamic: 180, static: 600 },
    // Flyer OCR runs on the server: keep tesseract as a real package and ship its worker + wasm files
    serverComponentsExternalPackages: ['tesseract.js', 'tesseract.js-core', 'ffmpeg-static'],
    outputFileTracingIncludes: {
      // Clip conversion runs ffmpeg on the server
      '/api/uploads/video/process': ['./node_modules/ffmpeg-static/ffmpeg'],
      '/api/events/read-flyers': ['./node_modules/tesseract.js/**/*', './node_modules/tesseract.js-core/**/*', './node_modules/bmp-js/**/*', './node_modules/is-url/**/*', './node_modules/node-fetch/**/*', './node_modules/regenerator-runtime/**/*', './node_modules/wasm-feature-detect/**/*', './node_modules/zlibjs/**/*', './node_modules/idb-keyval/**/*', './node_modules/opencollective-postinstall/**/*', './node_modules/is-electron/**/*', './node_modules/whatwg-url/**/*', './node_modules/tr46/**/*', './node_modules/webidl-conversions/**/*'],
    },
  },
};

export default nextConfig;
