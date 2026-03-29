"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function PromoBanner() {
  return (
    <section className="py-16 bg-gradient-to-r from-[#FF6B6B] to-[#FF8A8A]">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-center text-white"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
            <Sparkles size={32} />
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            For the Modern Indian Woman
          </h2>
          <p className="text-white/90 text-lg mb-4 max-w-2xl mx-auto">
            She is ambitious, independent, and deeply rooted in her responsibilities.
            She wants products that respect both her body and her lifestyle.
          </p>
          <p className="text-white/80 text-base mb-8 max-w-xl mx-auto">
            Use code <span className="font-bold bg-white/20 px-3 py-1 rounded-full">WELCOME15</span> for 15% off your first order
          </p>
          <Link
            href="/products"
            className="inline-flex items-center px-8 py-4 bg-white text-[#FF6B6B] font-semibold rounded-full hover:bg-gray-100 transition-all shadow-lg"
          >
            Shop Now
            <ArrowRight size={18} className="ml-2" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
