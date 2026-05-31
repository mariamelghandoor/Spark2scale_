"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LegoLoader from "@/components/lego/LegoLoader";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedUserTypes?: string[];
}

export default function ProtectedRoute({ 
    children, 
    allowedUserTypes 
}: ProtectedRouteProps) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('auth_token');
            
            if (!token) {
                router.push('/signin');
                return;
            }

            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
                // Clean API URL: remove trailing slash and /api if present
                let cleanApiUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
                cleanApiUrl = cleanApiUrl.replace(/\/api$/, ''); // Remove /api if at the end
                const response = await fetch(`${cleanApiUrl}/api/Auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Unauthorized');
                }

                const data = await response.json();
                const userType = data.user.user_type;

                if (allowedUserTypes && !allowedUserTypes.includes(userType)) {
                    // Redirect to correct dashboard based on user type
                    if (userType === 'founder') {
                        router.push('/founder/dashboard');
                    } else if (userType === 'investor') {
                        router.push('/investor/feed');
                    } else {
                        router.push('/contributor/dashboard');
                    }
                    return;
                }

                setIsAuthenticated(true);
            } catch (error) {
                // Invalid token - clear storage and redirect
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
                router.push('/signin');
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [router, allowedUserTypes]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
                <LegoLoader />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}

