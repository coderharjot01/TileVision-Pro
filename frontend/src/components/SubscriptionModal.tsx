import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userId?: string;
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  userEmail,
  userId
}: SubscriptionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setError(null);

    // If user is not logged in, they must log in first
    if (!userId || !userEmail) {
      setError('Please sign in or create an account first before upgrading.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          email: userEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create checkout session.');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url; // Redirect to Stripe Checkout
      } else {
        throw new Error('No checkout URL received from server.');
      }
    } catch (err: any) {
      console.error('Upgrade error:', err);
      setError(err.message || 'Failed to initialize payment. Please check if backend server is online.');
    } finally {
      setIsLoading(false);
    }
  };

  const freeFeatures = [
    'Save up to 3 projects locally/cloud',
    'Interactive 2D tile canvas visualizer',
    'Custom tile dimension calculations',
    'Skirting requirements & math settings',
    'Basic straight/brick lay patterns',
  ];

  const proFeatures = [
    'Everything in Free Plan',
    'Unlimited projects saved in the secure cloud',
    'Premium PDF Layout Blueprint Reports',
    'Multi-room material consolidation',
    'Premium pattern layouts (Herringbone, Chevron, etc.)',
    'Self-service customer billing portal',
    'Priority developer support & analytics',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-luxury-charcoal/40 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl glass-panel-light border border-white/60 shadow-2xl p-8 z-10 flex flex-col max-h-[90vh]"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-6 top-6 p-1.5 rounded-full hover:bg-black/5 text-gray-500 hover:text-luxury-charcoal transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-8 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-luxury-gold/15 text-luxury-gold-hover text-[10px] font-bold tracking-widest uppercase rounded-full mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Pricing Options
              </span>
              <h2 className="text-2xl font-bold text-luxury-charcoal">
                Choose Your Professional Tier
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Unlock advanced calculations, premium blueprints, and unlimited projects
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5 text-xs text-red-700 shrink-0">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1 pb-4">
              {/* Free Tier Card */}
              <div className="rounded-2xl border border-gray-150 bg-white/40 p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-luxury-charcoal">Free / Guest</h3>
                  <p className="text-xs text-gray-400 mt-1">Ideal for exploring layout configurations</p>
                  
                  <div className="my-5 flex items-baseline">
                    <span className="text-3xl font-extrabold text-luxury-charcoal">$0</span>
                    <span className="text-xs text-gray-400 ml-1">/ forever</span>
                  </div>

                  <ul className="space-y-2.5 text-left mb-6">
                    {freeFeatures.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-600">
                        <Check className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={onClose}
                  className="w-full bg-white hover:bg-gray-100 border border-gray-200 text-luxury-charcoal py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition duration-300 cursor-pointer"
                >
                  Continue Free
                </button>
              </div>

              {/* Pro Tier Card */}
              <div className="rounded-2xl border-2 border-luxury-gold bg-luxury-charcoal text-white p-6 flex flex-col justify-between relative overflow-hidden shadow-xl shadow-luxury-gold/5">
                {/* Popular Badge */}
                <div className="absolute top-0 right-0 bg-luxury-gold text-luxury-charcoal text-[9px] font-bold uppercase tracking-wider py-1.5 px-4 rounded-bl-xl">
                  Most Popular
                </div>

                <div>
                  <h3 className="text-lg font-bold text-luxury-gold">Pro Member</h3>
                  <p className="text-xs text-gray-300 mt-1">Full professional features for contract estimates</p>
                  
                  <div className="my-5 flex items-baseline">
                    <span className="text-3xl font-extrabold text-white">$21</span>
                    <span className="text-xs text-gray-300 ml-1">/ month</span>
                  </div>

                  <ul className="space-y-2.5 text-left mb-6">
                    {proFeatures.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-200">
                        <Check className="w-4 h-4 text-luxury-gold shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="w-full bg-luxury-gold hover:bg-luxury-gold-hover text-luxury-charcoal hover:text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-luxury-gold/20"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Preparing Checkout...
                    </>
                  ) : (
                    <>
                      <span>Upgrade to Pro</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-4 text-[10px] text-gray-400 shrink-0">
              Secure transactions processed via Stripe. Cancel anytime from your account settings.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
