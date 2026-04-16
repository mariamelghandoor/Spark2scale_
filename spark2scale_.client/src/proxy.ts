import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protected routes - require authentication
    const protectedPaths = [
        '/founder',
        '/contributor',
        '/investor',
        '/profile'
    ];

    // Check if current path requires authentication
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

    if (isProtectedPath) {
        // Check for auth token in cookies
        const authToken = request.cookies.get('auth_token')?.value;

        if (!authToken) {
            // No token found - redirect to signin with intended path
            const url = request.nextUrl.clone();

            // Create response with redirect
            url.pathname = '/signin';
            url.searchParams.set('redirect', pathname);
            const response = NextResponse.redirect(url);

            // Store the intended path in a cookie as backup
            response.cookies.set('intended_redirect', pathname, {
                httpOnly: false, // Allow JS to read it
                maxAge: 600, // 10 minutes
                path: '/',
                sameSite: 'lax'
            });

            return response;
        }
    }

    return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
    matcher: [
        '/founder/:path*',
        '/contributor/:path*',
        '/investor/:path*',
        '/profile/:path*'
    ]
};
