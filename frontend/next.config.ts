import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Photo/avatar/cover uploads pass through Server Actions; the default
      // cap is 1 MB, which rejects most phone-camera images. Raise it.
      bodySizeLimit: "10mb",
    },
  },
  images: {
    // Every user image lives on Cloudinary. next/image refuses to optimise a
    // remote host that is not listed here, so leaving this out makes each
    // <Image> throw at runtime rather than fall back to the original URL.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
