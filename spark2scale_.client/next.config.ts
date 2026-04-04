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
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';

        // List all backend controller prefixes here.
        // /api/token is intentionally excluded — it is handled by Next.js itself (for LiveKit JWT).
        const backendPrefixes = [
            'Auth', 'Documents', 'DocumentVersions', 'Startups',
            'PptGeneration', 'Users', 'Chat', 'Workflow', 'Invitations',
            'Investors', 'Founders', 'Recommendations', 'Notifications',
        ];

        return backendPrefixes.map(prefix => ({
            source: `/api/${prefix}/:path*`,
            destination: `${apiUrl}/api/${prefix}/:path*`,
        }));
    },
};

export default nextConfig;
