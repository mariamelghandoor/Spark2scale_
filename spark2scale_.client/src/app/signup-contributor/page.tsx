'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'; // Assuming generic image for now or use one from assets
// import { inviteAuthService } from '@/services/authService'; // Removed invalid import
import apiClient from '@/lib/apiClient';

// Helper to wrap useSearchParams in Suspense boundary
function SignUpForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Auto-fill from Invitation
    const email = searchParams.get('email') || '';
    const token = searchParams.get('token') || '';
    const startupId = searchParams.get('startupId') || '';

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
            // 1. Sign Up User (Standard Auth but with Contributor type and StartupId)
            // We need to match the backend 'FullSignUpRequest' structure:
            // { Name, Email, Password, ConfirmPassword, Phone, AddressRegion, UserType, Tags[], StartupId }

            const payload = {
                Name: `${formData.firstName} ${formData.lastName}`.trim(),
                Email: formData.email,
                Password: formData.password,
                ConfirmPassword: formData.confirmPassword,
                Phone: formData.phone,
                AddressRegion: formData.region,
                UserType: 'contributor',
                Tags: [],
                StartupId: startupId ? startupId : null
            };

            const response = await apiClient.post('/api/Auth/signup', payload);

            // 2. If successful, we need to finalize the invitation acceptance?
            // Actually, the AuthController logic creates the User -> Profile -> Contributor record.
            // BUT, the 'Invitation' status in the database is still 'Pending'.
            // We need to update that locally or trigger it.
            // However, the user needs to Verify Email first usually.

            // If the signup was successful, the backend might have created the contributor link.
            // BUT the invitation status is separate.
            // Ideally, we should call 'Respond' after verification. 
            // OR, if the user is trusted because they came from a valid token link, maybe we auto-verify? 
            // Unlikely without significant Auth changes.

            // Simple Flow: 
            // User Signs up -> Email Verification Sent.
            // User Verifies -> Logs In.
            // User needs to go back to the invite link? Or we handle it?

            // BETTER APPROACH:
            // 1. User Signs Up.
            // 2. We tell them to check email.
            // 3. (Optional) We could call `invitationService.respond` HERE if we had the user ID, 
            //    but we might not have it if email confirmation is required (Auth.User is null).

            // So: Just proceed with Signup.
            // The user will verify email, then log in.
            // Upon login, we can't easily auto-redirect back to 'respond' unless we store state.
            // But wait, the `StartupContributor` record is created in `AuthController.SignUp` if `StartupId` is passed!
            // So they ARE added to the team.
            // The only thing left is to mark Invitation as "Accepted" in `invitations` table.
            // We can do this if we trust the flow, or just let it expire. 
            // Best practice: Update it.
            // We can call an endpoint to "Consume Token" if we don't have User ID yet? 
            // Or just let the backend handle it?
            // Since `AuthController` doesn't know about `Invitation` table (Token), it can't update it.

            // Workaround: Call a separate endpoint to mark invitation as used? 
            // Or just ignore it since `StartupContributor` is the source of truth.
            // Let's just finish the signup.

            router.push('/signup/verify'); // Redirect to generic verification instruction page.

        } catch (err: unknown) {
            const errorObj = err as { response?: { data?: { message?: string } } };
            setError(errorObj.response?.data?.message || 'Signup failed. Please try again.');
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
                        readOnly={!!email} // Read-only if from invite
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg outline-none transition-all ${email ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-[#576238] focus:border-transparent'}`}
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
