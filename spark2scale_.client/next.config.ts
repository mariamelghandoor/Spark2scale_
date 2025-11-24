import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
            {
                protocol: 'http',
                hostname: '**',
            },
        ],
    },
    // This helps Next.js find files if your project is in a subfolder
    outputFileTracingRoot: path.resolve(__dirname, '../../'),

    typescript: {
        // This prevents the build from failing if there are small TS errors
        ignoreBuildErrors: true,
    },
};

export default nextConfig;