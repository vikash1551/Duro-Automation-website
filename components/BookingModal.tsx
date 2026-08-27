"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBookingModal } from "@/lib/store";

export default function BookingModal() {
  const { isOpen, closeBookingModal } = useBookingModal();
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    closeBookingModal();
    setTimeout(() => {
      setSubmitted(false);
      setLoading(false);
      setError("");
      setFormData({ name: "", email: "", phone: "" });
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-stone-950 p-7 md:p-10 shadow-2xl z-10 overflow-hidden"
          >
            {/* Ambient gold glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-stone-400 hover:border-gold hover:text-gold transition-colors duration-200"
              aria-label="Close modal"
            >
              ✕
            </button>

            {submitted ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold border border-gold/40 text-2xl">
                  ✓
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-medium text-white mb-3">
                  Service Request Received
                </h3>
                <p className="text-sm font-light text-stone-300 leading-relaxed max-w-xs mx-auto mb-8">
                  Thank you, <span className="text-gold font-normal">{formData.name}</span>. Our automation team will get in touch with you shortly.
                </p>
                <button
                  onClick={handleClose}
                  className="rounded-full bg-gold px-8 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black hover:bg-goldsoft transition-colors duration-300"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <p className="text-[10px] md:text-[11px] uppercase tracking-widest2 text-gold mb-2">
                  DURO Automation
                </p>
                <h2 className="font-display text-3xl md:text-4xl font-medium text-white mb-2">
                  Book Service
                </h2>
                <p className="text-sm font-light text-stone-400 mb-8 leading-relaxed">
                  Enter your contact information below to request automation service or consultation.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-[0.15em] text-stone-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder-stone-500 focus:border-gold focus:bg-white/[0.07] focus:outline-none transition-colors duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-[0.15em] text-stone-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder-stone-500 focus:border-gold focus:bg-white/[0.07] focus:outline-none transition-colors duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-[0.15em] text-stone-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder-stone-500 focus:border-gold focus:bg-white/[0.07] focus:outline-none transition-colors duration-200"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-400 text-center">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 rounded-full bg-gold py-4 text-xs font-semibold uppercase tracking-[0.2em] text-black hover:bg-goldsoft hover:shadow-[0_0_20px_rgba(200,162,95,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Submitting..." : "Submit"}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
