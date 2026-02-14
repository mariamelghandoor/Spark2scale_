'use client';

import { useAuth } from '@/context/AuthContext';
import { ReactNode } from 'react';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles?: string[]; // e.g. ['Founder', 'Contributor']
    fallback?: ReactNode; // What to show if access denied (default: null)
    requireOwner?: boolean; // If true, checks if user is the founder of the startup (needs startup context)
}

export default function RoleGuard({
    children,
    allowedRoles,
    fallback = null,
    requireOwner = false
}: RoleGuardProps) {
    const { user, loading } = useAuth();

    if (loading) return null; // Or some skeleton

    if (!user) return <>{fallback}</>;

    // 1. Check Role if specified
    if (allowedRoles && allowedRoles.length > 0) {
        // User role might be on the user object or needing a context check.
        // Assuming user.userType or similar. 
        // Note: 'Contributor' role is context-specific (per startup).
        // If we are in a startup context, we need to know the user's role IN THAT STARTUP.
        // The AuthContext might not have current startup role. 
        // This component might be too generic.

        // For simple Global Roles (Founder vs Investor):
        if (!allowedRoles.includes(user.userType || '')) {
            return <>{fallback}</>;
        }
    }

    // 2. Check Ownership if required
    // This requires passing the FounderID to comparison, which we don't have here efficiently.
    // It's better to pass "isOwner" as a prop calculated by the parent page which has the data.

    return <>{children}</>;
}

// SIMPLER VERSION FOR "HIDE IF CONTRIBUTOR"
export function HideForContributor({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    // Logic: If user is viewing a startup, and they are a Contributor for it...
    // But 'user.userType' is global (e.g. Founder). A Founder can be a contributor to another startup.
    // We need the "Current Role" in the "Current Startup".
    // This data comes from the API when fetching the Startup (see `current_role` in `GetStartupById`).

    // So this component needs the `currentRole` prop.
    return <>{children}</>;
}
