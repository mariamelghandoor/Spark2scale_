'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { invitationService, InvitationResponse } from '@/services/invitationService';
import Link from 'next/link';
import LegoLoader from "@/components/lego/LegoLoader";

function InviteContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [invitation, setInvitation] = useState<InvitationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setError('Invalid invitation link. Token is missing.');
            setLoading(false);
            return;
        }

        const fetchInvitation = async () => {
            try {
                const data = await invitationService.verify(token);
                console.log('Invitation Data:', data);
                setInvitation(data);

                // Store invitation context in localStorage for auth flow (survives redirects/new tabs)
                localStorage.setItem('pendingInvitation', JSON.stringify({
                    token: token,
                    startupId: data.startupId || (data as any).StartupId,
                    startupName: data.startupName || (data as any).StartupName,
                    email: data.email || (data as any).Email,
                    role: data.role || (data as any).Role
                }));
            } catch (err: unknown) {
                console.error(err);
                const errorObj = err as { response?: { data?: { message?: string } } };
                const msg = errorObj.response?.data?.message || '';

                if (msg.includes('already Accepted')) {
                    setError('This invitation has already been accepted.');
                } else if (msg.includes('expired')) {
                    setError('This invitation has expired.');
                } else {
                    setError(msg || 'Failed to validate invitation.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchInvitation();
    }, [token]);

    const handleReject = async () => {
        if (!invitation || !token) return;
        setProcessing(true);
        try {
            await invitationService.respond({
                token: token,
                accept: false,
                userId: "00000000-0000-0000-0000-000000000000" // Empty GUID for rejection
            });

            router.push('/invite/thank-you');
        } catch (err: unknown) {
            const errorObj = err as { response?: { data?: { message?: string } } };
            setError(errorObj.response?.data?.message || 'Failed to reject invitation.');
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F0EADC]">
                <LegoLoader />
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
                    <p className="text-gray-600 text-center mb-4">Please note that by accepting, you will be joining the team as a contributor.</p>

                    <Link
                        href={`/invite/join?token=${token || ''}&startupId=${invitation?.startupId || invitation?.StartupId || ''}&email=${invitation?.email || invitation?.Email || ''}&role=${invitation?.role || invitation?.Role || ''}&startupName=${encodeURIComponent(invitation?.startupName || invitation?.StartupName || '')}`}
                        className="block w-full bg-[#576238] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#4a5430] text-center shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                        <span>Accept Invitation</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </Link>

                    <button
                        onClick={handleReject}
                        disabled={processing}
                        className="w-full bg-white text-red-500 border-2 border-transparent hover:bg-red-50 py-3 rounded-xl font-medium transition-colors mt-2"
                    >
                        {processing ? 'Declining...' : 'Decline Invitation'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function InvitePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F0EADC]"><LegoLoader /></div>}>
            <InviteContent />
        </Suspense>
    );
}
