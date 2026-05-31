'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LegoSpinner from "@/components/lego/LegoSpinner";
function JoinContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const token = searchParams.get('token');
    const startupId = searchParams.get('startupId');
    const email = searchParams.get('email');
    const startupName = searchParams.get('startupName'); // Optional, for display if we pass it
    const role = searchParams.get('role'); // Optional

    console.log('Join Page Params:', { token, startupId, email, startupName, role });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token || !startupId) {
            setError('Missing invitation information. Please try clicking the invitation link again.');
        }
        setLoading(false);
    }, [token, startupId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F0EADC]">
                <LegoSpinner className="h-10 w-10 animate-spin text-[#576238]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F0EADC] p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </div>
                    <h2 className="text-xl font-bold text-[#576238] mb-2">Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Link href="/invite/accept" className="text-[#576238] hover:underline">
                        Go back
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F0EADC] p-4 bg-pattern">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full">
                <div className="text-center mb-8">
                    <div className="h-16 w-16 bg-[#576238]/10 text-[#576238] rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                    </div>
                    <h1 className="text-3xl font-bold text-[#576238] mb-2">Join the Team</h1>
                    <p className="text-gray-600">
                        How would you like to proceed?
                    </p>
                </div>

                <div className="space-y-4">
                    <Link
                        href={`/signin?invitationPending=true&token=${token || ''}&startupId=${startupId || ''}&email=${email && email !== 'undefined' ? email : ''}`}
                        className="block w-full bg-[#576238] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#4a5430] text-center shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
                    >
                        <span>Sign In</span>
                        <span className="text-white/70 text-sm font-normal">(Existing User)</span>
                    </Link>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Or</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <Link
                        href={`/signup-contributor?invitationPending=true&token=${token || ''}&startupId=${startupId || ''}&email=${email && email !== 'undefined' ? email : ''}`}
                        className="block w-full bg-white text-[#576238] border-2 border-[#576238] py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 text-center transition-all flex items-center justify-center gap-2"
                    >
                        <span>Sign Up</span>
                        <span className="text-[#576238]/70 text-sm font-normal">(New Contributor)</span>
                    </Link>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F0EADC]">Loading...</div>}>
            <JoinContent />
        </Suspense>
    );
}
