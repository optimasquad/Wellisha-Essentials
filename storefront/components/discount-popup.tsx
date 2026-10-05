"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Phone } from "lucide-react";
import toast from "react-hot-toast";

export function DiscountPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem("wellisha_popup_seen");
    if (!hasSeenPopup) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("wellisha_popup_seen", "true");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone?.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (res.ok) {
        setSuccess(true);
        toast.success("Welcome! Use code WELCOME15 for 15% off!");
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        const data = await res.json();
        toast.error(data?.error ?? "Something went wrong");
      }
    } catch (error) {
      console.error("Newsletter error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFE5E5] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#FFE5E5] rounded-full translate-y-1/2 -translate-x-1/2" />

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="relative z-10">
              {!success ? (
                <>
                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-[#FF6B6B] rounded-full flex items-center justify-center">
                      <Gift size={32} className="text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
                    Get 15% OFF
                  </h2>
                  <p className="text-gray-600 text-center mb-6">
                    on your first order! Enter your phone number to claim your exclusive discount.
                  </p>

                  {/* Form */}
                  <form onSubmit={handleSubmit}>
                    <div className="relative mb-4">
                      <Phone
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e?.target?.value?.replace?.(/\D/g, "")?.slice?.(0, 10) ?? "")}
                        placeholder="Enter 10-digit phone number"
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:border-[#FF6B6B] transition-colors"
                        maxLength={10}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-[#FF6B6B] text-white font-semibold rounded-full hover:bg-[#E55A5A] transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? "Claiming..." : "Claim My 15% OFF"}
                    </button>
                  </form>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    By subscribing, you agree to receive marketing messages from Wellisha.
                  </p>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gift size={32} className="text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
                  <p className="text-gray-600">
                    Use code <span className="font-bold text-[#FF6B6B]">WELCOME15</span> at checkout.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
