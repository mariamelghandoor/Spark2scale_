import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
    output: 'standalone',

    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
            { protocol: 'http', hostname: '**' },
        ],
    },

    outputFileTracingRoot: path.resolve(__dirname, '../../'),

    typescript: {
        ignoreBuildErrors: true,
    },

    async rewrites() {
        // All /api/* requests are proxied to the C# backend.
        // LiveKit's token route was moved to /lk/token (outside of /api/)
        // so it is handled by Next.js natively and never hit this proxy.
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
        return [
            {
                source: '/api/:path*',
                destination: `${apiUrl}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
