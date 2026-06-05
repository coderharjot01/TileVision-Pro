import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, CreditCard, Sparkles, ChevronDown, UserCheck } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface UserNavProps {
  email: string;
  userId: string;
  subscriptionStatus: 'free' | 'pro';
  onLogout: () => void;
  onOpenPricing: () => void;
}

export default function UserNav({
  email,
  userId,
  subscriptionStatus,
  onLogout,
  onOpenPricing
}: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isPro = subscriptionStatus === 'pro';

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePortalRedirect = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create customer portal session.');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url; // Redirect to Stripe Billing Portal
      } else {
        throw new Error('No portal URL received from server.');
      }
    } catch (err) {
      console.error('Portal redirect error:', err);
      alert('Could not access subscription settings. Please confirm if server is running.');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const truncateEmail = (str: string) => {
    if (str.length <= 22) return str;
    const parts = str.split('@');
    if (parts[0].length > 12) {
      return `${parts[0].substring(0, 10)}...@${parts[1]}`;
    }
    return str;
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-luxury-gold text-luxury-charcoal font-semibold text-xs transition-all duration-300 cursor-pointer shadow-sm"
      >
        <div className={`p-1 rounded-md ${isPro ? 'bg-luxury-gold/15 text-luxury-gold' : 'bg-gray-100 text-gray-500'}`}>
          {isPro ? <Sparkles className="w-3.5 h-3.5 animate-pulse" /> : <User className="w-3.5 h-3.5" />}
        </div>
        <span className="hidden sm:inline-block max-w-[140px] truncate">{truncateEmail(email)}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl glass-panel-light border border-white/60 shadow-2xl p-2 z-50 animate-slide-up origin-top-right">
          {/* User Details */}
          <div className="p-3 border-b border-gray-100 mb-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Signed In As</p>
            <p className="text-xs font-bold text-luxury-charcoal truncate mt-0.5" title={email}>{email}</p>
            
            {/* Plan Badge */}
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md ${
                isPro
                  ? 'bg-luxury-gold/20 text-luxury-gold-hover border border-luxury-gold/30'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`}>
                {isPro ? 'PRO member' : 'FREE plan'}
              </span>
              {!isPro && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenPricing();
                  }}
                  className="text-[10px] text-luxury-gold-hover hover:text-luxury-gold font-bold underline cursor-pointer"
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>

          {/* Action List */}
          <div className="space-y-0.5">
            {isPro ? (
              <button
                onClick={handlePortalRedirect}
                disabled={isLoadingPortal}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-semibold text-gray-700 hover:bg-black/5 hover:text-luxury-charcoal transition-colors cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span>{isLoadingPortal ? 'Loading Portal...' : 'Manage Billing'}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenPricing();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-semibold text-luxury-gold-hover hover:bg-luxury-gold/10 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-luxury-gold" />
                <span>Upgrade to Pro Plan</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
