import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
    // 1. MUST ADD: This creates the standalone folder for Azure
    output: 'standalone', 

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

    // This helps Next.js trace files in your subfolder structure
    outputFileTracingRoot: path.resolve(__dirname, '../../'),

    typescript: {
        ignoreBuildErrors: true,
    },

    async rewrites() {
        // 2. DYNAMIC API: Use the Azure variable if it exists, otherwise localhost
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
