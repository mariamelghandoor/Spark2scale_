import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export interface User {
    user_type?: string;
    userType?: string;
    [key: string]: unknown;
}

export interface AuthResponse {
    token: string;
    user?: User;
}

// ... existing imports

/**
 * Helper function to set a cookie in the browser
 */
export function setCookie(name: string, value: string, days: number = 30) {
    if (typeof window === 'undefined') return;

    const maxAge = days * 24 * 60 * 60; // Convert days to seconds
    document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Helper function to delete a cookie
 */
export function deleteCookie(name: string) {
    if (typeof window === 'undefined') return;

    document.cookie = `${name}=; path=/; max-age=0`;
}

/**
 * Resolves the user type from the user object, handling different casing (user_type vs userType).
 */
export function resolveUserType(user: User): string {
    return (user.user_type || user.userType || '').toLowerCase();
}

/**
 * Returns the dashboard route for a given user type.
 */
export function getDashboardRoute(userType: string): string {
    const type = userType.toLowerCase();
    switch (type) {
        case 'founder':
            return '/founder/dashboard';
        case 'investor':
            return '/investor/feed';
        case 'contributor':
            return '/contributor/dashboard';
        default:
            console.warn(`Unknown user type: ${userType}`);
            return '/signin'; // Fallback
    }
}

/**
 * Handle successful authentication: stores token, fetches user, and redirects.
 * @param token The JWT token received from backend
 * @param router Next.js router instance
 * @param apiUrl Base API URL
 */
export async function handleAuthSuccess(token: string, router: AppRouterInstance, apiUrl: string, providedUser?: User) {
    if (!token) {
        throw new Error('No access token provided');
    }

    // 1. Store token in both localStorage and cookie
    localStorage.setItem('auth_token', token);
    setCookie('auth_token', token, 30); // 30 days expiration

    let user = providedUser;

    // 2. Fetch full user profile if not provided
    if (!user) {
        // Clean API URL first
        let cleanApiUrl = apiUrl.replace(/\/$/, '');
        cleanApiUrl = cleanApiUrl.replace(/\/api$/, '');

        const meResponse = await fetch(`${cleanApiUrl}/api/Auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
        });

        if (!meResponse.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const meData = await meResponse.json();
        user = meData.user || meData; // Handle potentially different wrapping
    }

    if (!user) {
        throw new Error('Invalid response: missing user data');
    }

    // 3. Store user data
    localStorage.setItem('user', JSON.stringify(user));

    // 4. Redirect based on user type
    const userType = resolveUserType(user);
    if (!userType) {
        throw new Error('User type not found in profile');
    }

    console.log('Redirecting for user type:', userType);
    const route = getDashboardRoute(userType);
    router.push(route);
}

/**
 * Check if user is authenticated by verifying token and user data exist
 */
export function isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;

    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');

    return !!(token && userStr);
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;

    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

/**
 * Clear authentication data and redirect to signin
 */
export function logout(router?: AppRouterInstance) {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    deleteCookie('auth_token');

    if (router) {
        router.push('/signin');
    } else if (typeof window !== 'undefined') {
        window.location.href = '/signin';
    }
}

