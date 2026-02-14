import Link from 'next/link';

export default function ThankYouPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F0EADC]">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-[#576238] mb-2">Thank You</h2>
                <p className="text-gray-600 mb-6">
                    Your response has been recorded. Thank you for letting us know.
                </p>
                <Link href="/" className="inline-block bg-[#576238] text-white px-6 py-2 rounded-lg hover:bg-[#4a5430] transition-colors">
                    Return Home
                </Link>
            </div>
        </div>
    );
}
