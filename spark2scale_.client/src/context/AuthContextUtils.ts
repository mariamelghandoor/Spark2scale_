/**
 * AuthContextUtils.ts
 * Separated to avoid Fast Refresh warnings when exporting non-components with components.
 */
import { createContext, useContext } from 'react';
import { User } from '@/lib/auth';

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (user: User, token: string) => void;
    signOut: () => void;
    refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: () => { },
    signOut: () => { },
    refreshUser: async () => { },
});

export const useAuth = () => useContext(AuthContext);
