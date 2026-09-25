'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Extend NextAuth Session types for custom fields
declare module 'next-auth' {
  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
      isPremium?: boolean;
    };
  }
}

interface CheckoutResponse {
  url?: string;
  error?: string;
}

export default function UpgradeCard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Checkout session creation failed with status: ${res.status}`);
      }

      const data: CheckoutResponse = await res.json();

      if (data.url) {
        window.location.href = data.url; // Redirect to Payment Provider
      } else {
        setErrorMessage(data.error || 'Failed to initiate checkout session.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="p-6 border border-slate-700 rounded-lg bg-slate-900 text-white animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-slate-800 rounded w-2/3"></div>
      </div>
    );
  }

  if (session?.user?.isAdmin) {
    return (
      <div className="p-4 bg-purple-900 text-white rounded font-medium border border-purple-700">
        Admin Access Active (All Gating Bypassed)
      </div>
    );
  }

  if (session?.user?.isPremium) {
    return (
      <div className="p-4 bg-green-900 text-white rounded font-medium border border-green-700">
        Premium Membership Active
      </div>
    );
  }

  return (
    <div className="p-6 border border-slate-700 rounded-lg bg-slate-900 text-white shadow-lg">
      <h3 className="text-xl font-bold mb-2">Unlock Full Access</h3>
      <p className="text-slate-400 mb-4">
        You need an active subscription to access premium features.
      </p>

      {errorMessage && (
        <div className="mb-4 p-3 text-sm bg-red-900/50 border border-red-600 rounded text-red-200">
          {errorMessage}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed rounded font-semibold transition-colors flex items-center gap-2"
      >
        {loading ? 'Redirecting...' : 'Subscribe Now'}
      </button>
    </div>
  );
}
