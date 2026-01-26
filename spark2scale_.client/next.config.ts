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
    outputFileTracingRoot: path.resolve(__dirname, '../../'),

    typescript: {
        ignoreBuildErrors: true,
    },

    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'https://localhost:7155/api/:path*',
            },
        ];
    },
};

export default nextConfig;