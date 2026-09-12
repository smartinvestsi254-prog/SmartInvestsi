'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function UpgradeCard() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const handleCheckout = async () => {
    // 1. Trigger Checkout API
    const res = await fetch('/api/checkout', { method: 'POST' });
    const { url } = await res.json();
    
    if (url) {
      window.location.href = url; // Redirect to Stripe Checkout
    }
  };

  if (session?.user?.isAdmin) {
    return <div className="p-4 bg-purple-900 text-white rounded">Admin Access Active (All Gating Bypassed)</div>;
  }

  if (session?.user?.isPremium) {
    return <div className="p-4 bg-green-900 text-white rounded">Premium Membership Active</div>;
  }

  return (
    <div className="p-6 border border-slate-700 rounded-lg bg-slate-900 text-white">
      <h3 className="text-xl font-bold mb-2">Unlock Full Access</h3>
      <p className="text-slate-400 mb-4">You need an active subscription to access premium features.</p>
      <button 
        onClick={handleCheckout}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold transition-colors"
      >
        Subscribe Now
      </button>
    </div>
  );
}
