"use client";

import Link from "next/link";
import { useState } from "react";
import { Instagram, Facebook, Twitter, Youtube, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export function Footer() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email?.trim?.()) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone: "" }),
      });
      
      if (res.ok) {
        toast.success("Thanks for subscribing!");
        setEmail("");
      } else {
        const data = await res.json();
        toast.error(data?.error ?? "Failed to subscribe");
      }
    } catch (error) {
      console.error("Newsletter error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#FFF5F5] border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Newsletter Subscription */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              We send really nice emails.
            </h3>
            <form onSubmit={handleNewsletterSubmit} className="flex">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e?.target?.value ?? "")}
                placeholder="E-mail"
                className="flex-1 px-4 py-3 border border-gray-300 border-r-0 rounded-l-md focus:outline-none focus:border-gray-400 bg-white"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-3 bg-gray-900 text-white rounded-r-md hover:bg-gray-800 transition-colors disabled:opacity-50"
                aria-label="Subscribe"
              >
                <ArrowRight size={20} />
              </button>
            </form>
            
            {/* Social Icons */}
            <div className="flex space-x-4 mt-6">
              <a
                href="#"
                className="text-gray-600 hover:text-[#FF6B6B] transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-[#FF6B6B] transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-[#FF6B6B] transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-[#FF6B6B] transition-colors"
                aria-label="Youtube"
              >
                <Youtube size={20} />
              </a>
            </div>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">SUPPORT</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/account/orders"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* About Us Links */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">ABOUT US</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Our Story
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* About Wellisha */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">ABOUT WELLISHA</h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              Wellisha Essentials was born to change the narrative for the modern
              Indian woman. We create period care that understands her body as
              deeply as it respects her dreams.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed mt-3">
              Our mission is to give every woman the freedom to live her fullest
              life, every day of the month. Because at Wellisha, confidence doesn&apos;t
              skip a single day.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 mt-10 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Wellisha Essentials Pvt. Ltd. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Gurugram, India | +91-9217647849 | care@wellisha.com
          </p>
        </div>
      </div>
    </footer>
  );
}
