"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Sparkles, Heart } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-[#FFF5F5] via-white to-[#FFE5E5] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block bg-[#FF6B6B] text-white text-sm font-medium px-4 py-1 rounded-full mb-4">
              Wellisha Essentials Pvt. Ltd.
            </span>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-4 leading-tight">
              Care That Feels Like{" "}
              <span className="text-[#FF6B6B]">Home</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              More than a product, Wellisha is a quiet promise: you can move through your day
              with dignity, comfort, and confidence—without having to slow down or apologize.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3 mb-8">
              <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
                <Sparkles size={16} className="text-[#FF6B6B] mr-2" />
                <span className="text-sm font-medium">Clean, Chemical-Free</span>
              </div>
              <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
                <Shield size={16} className="text-green-600 mr-2" />
                <span className="text-sm font-medium">Leak Secure Design</span>
              </div>
              <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
                <Heart size={16} className="text-pink-500 mr-2" />
                <span className="text-sm font-medium">Gentle on Skin</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/products"
                className="inline-flex items-center px-8 py-4 bg-[#FF6B6B] text-white font-semibold rounded-full hover:bg-[#E55A5A] transition-all shadow-lg hover:shadow-xl"
              >
                Shop Now
                <ArrowRight size={18} className="ml-2" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center px-8 py-4 border-2 border-[#FF6B6B] text-[#FF6B6B] font-semibold rounded-full hover:bg-[#FF6B6B] hover:text-white transition-all"
              >
                Our Story
              </Link>
            </div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square max-w-lg mx-auto">
              <div className="absolute inset-0 bg-[#FF6B6B]/10 rounded-full animate-pulse" />
              <Image
                src="/products/wellisha-hero.jpg"
                alt="Wellisha Premium Sanitary Pads - Ergonomically designed with gynaecologists"
                fill
                className="object-contain z-10 rounded-2xl"
                priority
              />
            </div>
            {/* Floating Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="absolute bottom-8 left-0 bg-white px-6 py-3 rounded-xl shadow-lg"
            >
              <p className="text-sm text-gray-500">Designed with</p>
              <p className="text-xl font-bold text-[#FF6B6B]">Gynaecologists</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-20 h-20 bg-[#FF6B6B]/10 rounded-full blur-xl" />
      <div className="absolute bottom-20 left-10 w-32 h-32 bg-[#FFB6C1]/20 rounded-full blur-xl" />
    </section>
  );
}
