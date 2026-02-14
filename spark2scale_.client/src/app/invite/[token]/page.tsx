'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation'; // Correct import for App Router
import { invitationService, InvitationResponse } from '@/services/invitationService';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function InvitePage() {
    const params = useParams();
    const router = useRouter();
    const { user, login } = useAuth();
    const [invitation, setInvitation] = useState<InvitationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    // Retrieve token from route params
    // Note: params.token might be string or string[]
    const token = Array.isArray(params?.token) ? params.token[0] : params?.token;

    useEffect(() => {
        if (!token) {
            setError('Invalid invitation link.');
            setLoading(false);
            return;
        }

        const fetchInvitation = async () => {
            try {
                const data = await invitationService.validate(token);
                setInvitation(data);
            } catch (err: unknown) {
                console.error(err);
                const errorObj = err as { response?: { data?: { message?: string } } };
                const msg = errorObj.response?.data?.message || '';

                if (msg.includes('already Accepted')) {
                    setError('This invitation has already been accepted.');
                } else {
                    setError(msg || 'Failed to validate invitation.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchInvitation();
    }, [token]);

    const handleAccept = async () => {
        if (!invitation || !token) return;
        setProcessing(true);

        try {
            // Scenario A: User is already logged in
            if (user) {
                await invitationService.respond({
                    token: token,
                    accept: true,
                    userId: user.id
                });

                // Redirect to Dashboard
                router.push('/dashboard/founder'); // Or logic to detect if contributor dashboard exists
                // Since this is for contributors, maybe /dashboard/contributor? 
                // Need to check where contributors go. Assuming Founder dashboard for now which might handle both or redirect.
                // The requirement says: "redirect directly to the Startup Dashboard for the specific startup"
                // e.g. /dashboard/startup/[id]
                router.push(`/dashboard/startup/${invitation.startupId}`);
            } else {
                // Scenario B: User is NOT logged in -> Redirect to Signup or Login
                // We pass the token/invitation info via query params to the signup page
                // so it can auto-fill email and know it's a contributor invite.

                const query = new URLSearchParams({
                    email: invitation.email,
                    token: token,
                    startupId: invitation.startupId,
                    type: 'contributor' // Pre-select user type
                }).toString();

                router.push(`/signup-contributor?${query}`);
            }
        } catch (err: unknown) {
            const errorObj = err as { response?: { data?: { message?: string } } };
            setError(errorObj.response?.data?.message || 'Failed to accept invitation.');
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!invitation || !token) return;
        setProcessing(true);
        try {
            // We don't strictly need a user ID to reject if we trust the token (view-only rejection)
            // But the backend `RespondInvitationRequest` might expect it? 
            // InvitationController.RespondInvitationRequest has `UserId`.
            // If unauthenticated rejection is allowed, backend should handle Guid.Empty.
            // Looking at backend: `if (request.Accept) { if (UserId == Empty) return BadRequest... }`
            // So Rejection DOES NOT require UserId. Good.

            await invitationService.respond({
                token: token,
                accept: false,
                userId: "00000000-0000-0000-0000-000000000000" // Empty GUID
            });

            router.push('/invite/thank-you'); // Need a thank you page or just show state
        } catch (err: unknown) {
            const errorObj = err as { response?: { data?: { message?: string } } };
            setError(errorObj.response?.data?.message || 'Failed to reject invitation.');
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F0EADC]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#576238]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F0EADC]">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-[#576238] mb-2">Invitation Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Link href="/" className="inline-block bg-[#576238] text-white px-6 py-2 rounded-lg hover:bg-[#4a5430] transition-colors">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F0EADC] p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#576238] mb-2">You're Invited!</h1>
                    <p className="text-gray-600">
                        You have been invited to join <span className="font-bold text-[#576238]">{invitation?.startupName}</span> as a <span className="font-bold">{invitation?.role}</span>.
                    </p>
                </div>

                <div className="space-y-4">
                    {user ? (
                        <>
                            <button
                                onClick={handleAccept}
                                disabled={processing}
                                className="w-full bg-[#576238] text-white py-3 rounded-xl font-semibold text-lg hover:bg-[#4a5430] transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            >
                                {processing ? 'Processing...' : 'Accept Invitation'}
                            </button>

                            <button
                                onClick={handleReject}
                                disabled={processing}
                                className="w-full bg-white text-gray-500 border-2 border-gray-200 py-3 rounded-xl font-semibold text-lg hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                Decline
                            </button>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-gray-600 text-center mb-4">Please log in or sign up to accept this invitation.</p>

                            <Link
                                href={`/signin?redirect=/invite/${token}`}
                                className="block w-full bg-[#576238] text-white py-3 rounded-xl font-semibold text-lg hover:bg-[#4a5430] text-center shadow-lg hover:shadow-xl"
                            >
                                Sign In (Existing User)
                            </Link>

                            <Link
                                href={`/signup?email=${encodeURIComponent(invitation?.email || '')}&token=${token}&type=contributor`}
                                className="block w-full bg-white text-[#576238] border-2 border-[#576238] py-3 rounded-xl font-semibold text-lg hover:bg-gray-50 text-center"
                            >
                                Sign Up (New Contributor)
                            </Link>

                            <button
                                onClick={handleReject}
                                disabled={processing}
                                className="w-full text-gray-400 hover:text-gray-600 text-sm mt-2"
                            >
                                Decline Invitation
                            </button>
                        </div>
                    )}
                </div>


            </div>
        </div>
    );
}
