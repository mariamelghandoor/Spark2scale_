'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/auth';
import { AuthContext } from './AuthContextUtils';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const loadUserFromStorage = () => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Failed to parse user from storage", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUserFromStorage();

        // Listen for storage events (e.g. login in another tab or manual setItem)
        const handleStorageChange = () => loadUserFromStorage();
        window.addEventListener('storage', handleStorageChange);

        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const login = (userData: User, token: string) => {
        // 1. Update State
        setUser(userData);

        // 2. Update Storage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(userData));

        // 3. Update Cookie
        const maxAge = 30 * 24 * 60 * 60;
        document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    };

    const signOut = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('roleData');
        document.cookie = 'auth_token=; path=/; max-age=0';
        setUser(null);
        router.push('/signin');
    };

    const refreshUser = async () => {
        loadUserFromStorage();
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signOut, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};
