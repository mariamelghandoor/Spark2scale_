'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/apiClient';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [status, setStatus] = useState('Checking verification status...');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendStatus, setResendStatus] = useState('');

    const email = searchParams.get('email');

    const handleResend = async () => {
        if (!email) return;
        setResendLoading(true);
        setResendStatus('');
        try {
            await apiClient.post('/api/Auth/resend-verification', { email });
            setResendStatus('Verification email resent! Please check your inbox.');
        } catch (error) {
            console.error("Resend failed", error);
            setResendStatus('Failed to resend email. Please try again later.');
        } finally {
            setResendLoading(false);
        }
    };

    // ... (rest of the component logic)

    useEffect(() => {
        // ... (useEffect logic)
        const checkInvitation = async () => {
            const postVerifyStr = sessionStorage.getItem('postVerificationInvitation');
            if (postVerifyStr && user) {
                setStatus('Processing your invitation...');
                try {
                    const invite = JSON.parse(postVerifyStr);
                    await apiClient.post('/api/Invitation/respond', {
                        token: invite.token,
                        accept: true,
                        userId: user.id
                    });
                    sessionStorage.removeItem('postVerificationInvitation');
                    router.push(`/contributor/startup/${invite.startupId}`);
                } catch (error) {
                    console.error("Failed to accept invitation", error);
                    setStatus('Failed to process invitation. Please try signing in manually.');
                }
            }
        };

        checkInvitation();
    }, [user, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F0EADC] p-4 bg-pattern">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                </div>

                <h2 className="text-3xl font-bold text-[#576238] mb-4">Check Your Email</h2>

                <p className="text-gray-600 mb-6">
                    We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
                </p>

                {user && (
                    <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mb-4 text-sm">
                        {status}
                    </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-500 mb-6">
                    <p className="mb-2">Didn't receive the email? Check your spam folder or:</p>
                    <button
                        onClick={handleResend}
                        disabled={resendLoading || !email}
                        className="text-[#576238] font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {resendLoading ? 'Sending...' : 'Click to Resend Verification Email'}
                    </button>
                    {resendStatus && <p className="mt-2 text-xs text-blue-600">{resendStatus}</p>}
                </div>

                {/* Return to Sign In link removed as requested */}
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyEmailContent />
        </Suspense>
    );
}
