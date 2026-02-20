'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import apiClient from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/lib/auth';

// Helper to wrap useSearchParams in Suspense boundary
function SignUpForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    // Check for pending invitation in sessionStorage first
    const [invitationContext, setInvitationContext] = useState<any>(null);

    useEffect(() => {
        const pendingInvitationStr = localStorage.getItem('pendingInvitation');
        if (pendingInvitationStr) {
            try {
                const invitation = JSON.parse(pendingInvitationStr);
                setInvitationContext(invitation);
            } catch (error) {
                console.error('Failed to parse pending invitation:', error);
            }
        }
    }, []);

    // Auto-fill from Invitation context or URL params (fallback)
    const email = invitationContext?.email || searchParams.get('email') || '';
    const token = invitationContext?.token || searchParams.get('token') || '';
    const startupId = invitationContext?.startupId || searchParams.get('startupId') || '';

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: email,
        password: '',
        confirmPassword: '',
        phone: '',
        region: ''
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Update email when invitation context loads
    useEffect(() => {
        if (invitationContext?.email) {
            setFormData(prev => ({ ...prev, email: invitationContext.email }));
        }
    }, [invitationContext]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            console.log("Signup Debug - Invitation Context:", invitationContext);

            if (!startupId || startupId === 'undefined' || startupId === 'null') {
                setError("Critical Error: Invalid Invitation Link (Missing Startup ID). Please go back to the invitation email and click the link again.");
                setLoading(false);
                return;
            }

            // 1. Sign Up User (Standard Auth but with Contributor type and StartupId)
            const payload = {
                Name: `${formData.firstName} ${formData.lastName}`.trim(),
                Email: formData.email,
                Password: formData.password,
                ConfirmPassword: formData.confirmPassword,
                Phone: formData.phone,
                AddressRegion: formData.region,
                UserType: 'contributor',
                Tags: [],
                StartupId: startupId,
                RedirectUrl: window.location.origin + '/auth/callback'
            };

            console.log("Sending Payload:", payload);

            const response = await apiClient.post('/api/Auth/signup', payload);
            const data = response.data;

            // 2. CHECK FOR AUTO-LOGIN (If Supabase Auto-Confirm is ON)
            if (data.token && data.user) {
                // Auto-login logic: If token is present, assume auto-confirmed
                login(data.user as User, data.token);

                // Clear pending invitation
                localStorage.removeItem('pendingInvitation');

                // Redirect directly to the startup dashboard
                router.push(`/contributor/startup/${startupId}`);
                console.log("Redirecting to dashboard...");
                return;
            }

            // 3. FALLBACK: Store invitation context for post-verification acceptance
            if (startupId) {
                localStorage.setItem('postVerificationInvitation', JSON.stringify({
                    token: token || '',
                    startupId: startupId,
                    email: formData.email
                }));
            }

            // Clear the pending invitation
            localStorage.removeItem('pendingInvitation');

            // Redirect to verify page with email
            router.push(`/signup/verify?email=${encodeURIComponent(formData.email)}`);


        } catch (err: any) {
            console.error("Signup Error:", err);
            let msg = 'Signup failed. Please try again.';

            if (err.response && err.response.data) {
                console.log("Backend Error Data:", err.response.data);
                if (err.response.data.message) msg = err.response.data.message;
                else if (typeof err.response.data === 'string') msg = err.response.data;

                if (err.response.data.errors) {
                    console.error("Validation Errors:", err.response.data.errors);
                }
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-[#576238]">Join as Contributor</h2>
                <p className="text-gray-500 mt-2">Complete your profile to join the team.</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input
                            type="text"
                            name="firstName"
                            required
                            value={formData.firstName}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#576238] focus:border-transparent outline-none transition-all"
                            placeholder="John"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input
                            type="text"
                            name="lastName"
                            required
                            value={formData.lastName}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#576238] focus:border-transparent outline-none transition-all"
                            placeholder="Doe"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                        type="email"
                        name="email"
                        required
                        readOnly={!!email && email !== 'undefined'} // Read-only only if valid email exists
                        value={formData.email === 'undefined' ? '' : formData.email}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg outline-none transition-all ${email && email !== 'undefined' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-[#576238] focus:border-transparent'}`}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#576238] focus:border-transparent outline-none transition-all"
                        placeholder="+1 (555) 000-0000"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                    <input
                        type="text"
                        name="region"
                        value={formData.region}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#576238] focus:border-transparent outline-none transition-all"
                        placeholder="e.g. North America, Europe"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#576238] focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#576238] focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#576238] text-white py-3 rounded-xl font-semibold text-lg hover:bg-[#4a5430] transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl mt-6"
                >
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                <p className="text-center text-sm text-gray-500 mt-4">
                    Already have an account?{' '}
                    <Link href={`/signin?email=${email}&startupId=${startupId}`} className="text-[#576238] font-semibold hover:underline">
                        Sign in
                    </Link>
                </p>
            </form>
        </div>
    );
}

export default function SignupContributorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F0EADC] p-4 bg-pattern">
            <Suspense fallback={<div>Loading...</div>}>
                <SignUpForm />
            </Suspense>
        </div>
    );
}
