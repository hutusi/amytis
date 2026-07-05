import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Next.js default is false (slug.html), but we use true (slug/index.html)
  // for two reasons:
  //   1. Co-located assets: posts can have a slug/images/ directory alongside
  //      slug/index.html. With false, slug.html and slug/ conflict on some
  //      static hosts and cause 403 errors.
  //   2. Nginx cosmetics: nginx.conf strips the trailing slash via redirect
  //      (/slug/ → /slug) so the visible URL matches the false convention
  //      without changing the export format.
  trailingSlash: true,
  output: "export",
  images: {
    loader: "custom",
    imageSizes: [64, 128, 256],
    deviceSizes: [640, 1200, 1920],
  },
  transpilePackages: ["next-image-export-optimizer"],
  experimental: {
    // Rewrites barrel-file imports (e.g. react-icons/fa6) to direct module
    // imports at build time, hardening tree-shaking for icon/d3 imports.
    optimizePackageImports: ["react-icons", "d3"],
  },
  env: {
    nextImageExportOptimizer_imageFolderPath: "public",
    nextImageExportOptimizer_exportFolderPath: "out",
    nextImageExportOptimizer_quality: "75",
    nextImageExportOptimizer_storePicturesInWEBP: "true",
    nextImageExportOptimizer_generateAndUseBlurImages: "true",
  },
};

export default nextConfig;
