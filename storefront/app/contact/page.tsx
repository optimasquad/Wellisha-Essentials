"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Message sent successfully! We'll get back to you soon.");
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Contact form error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e?.target?.name ?? ""]: e?.target?.value ?? "",
    });
  };

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Hero Section with Illustration */}
      <section className="relative overflow-hidden py-12 lg:py-16">
        {/* Decorative clouds */}
        <div className="absolute top-8 left-8 w-24 h-12 bg-white rounded-full opacity-80" />
        <div className="absolute top-16 left-20 w-16 h-8 bg-white rounded-full opacity-60" />
        <div className="absolute top-12 right-16 w-20 h-10 bg-white rounded-full opacity-70" />
        <div className="absolute top-20 right-32 w-14 h-7 bg-white rounded-full opacity-50" />
        
        {/* Decorative hills */}
        <div className="absolute bottom-0 left-0 right-0 h-32">
          <svg viewBox="0 0 1440 120" className="w-full h-full" preserveAspectRatio="none">
            <path fill="#FFE5E5" d="M0,60 C200,120 400,0 600,60 C800,120 1000,30 1200,60 C1300,80 1400,40 1440,60 L1440,120 L0,120 Z" />
            <path fill="#E8F5E9" d="M0,80 C150,40 300,100 500,70 C700,40 900,100 1100,70 C1250,50 1350,90 1440,80 L1440,120 L0,120 Z" opacity="0.7" />
            <path fill="#FFF9C4" d="M0,100 C200,70 400,110 700,90 C1000,70 1200,100 1440,90 L1440,120 L0,120 Z" opacity="0.5" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6"
          >
            Contact Us!
          </motion.h1>
          
          {/* Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative w-64 h-64 mx-auto mb-8"
          >
            {/* Phone illustration */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <svg viewBox="0 0 200 200" className="w-48 h-48">
                {/* Phone receiver */}
                <path
                  d="M40,120 Q20,100 30,70 Q40,40 70,50 L80,60 Q60,80 70,100 Q80,120 100,130 L110,140 Q140,150 150,120 Q160,90 130,80 Q100,70 80,90"
                  fill="#FFB4A2"
                  stroke="#E07A5F"
                  strokeWidth="3"
                />
                {/* Speech bubble */}
                <circle cx="130" cy="50" r="25" fill="#FFD6E0" />
                <text x="130" y="55" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333">HELLO</text>
              </svg>
            </div>
            {/* Girl illustration */}
            <div className="absolute right-0 bottom-0">
              <svg viewBox="0 0 100 150" className="w-32 h-40">
                {/* Hair */}
                <ellipse cx="50" cy="40" rx="25" ry="30" fill="#2D3436" />
                {/* Face */}
                <ellipse cx="50" cy="45" rx="18" ry="20" fill="#FFEAA7" />
                {/* Body */}
                <path d="M35,65 Q30,80 35,110 L65,110 Q70,80 65,65 Z" fill="#74B9FF" />
                {/* Arm */}
                <path d="M65,70 Q80,60 85,50" stroke="#74B9FF" strokeWidth="8" fill="none" strokeLinecap="round" />
                <circle cx="85" cy="48" r="6" fill="#FFEAA7" />
                {/* Skirt */}
                <path d="M30,110 Q50,115 70,110 L75,145 Q50,150 25,145 Z" fill="#FDCB6E" />
                {/* Legs */}
                <line x1="38" y1="145" x2="38" y2="150" stroke="#FFEAA7" strokeWidth="6" />
                <line x1="62" y1="145" x2="62" y2="150" stroke="#FFEAA7" strokeWidth="6" />
              </svg>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Info & Form */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              We&apos;re here for all your comfort queries.
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Got questions about periods or if you&apos;re wondering about our products, an order, or our website? 
              Shoot us an email at <a href="mailto:care@wellisha.com" className="text-[#FF6B6B] font-medium hover:underline">care@wellisha.com</a>
            </p>
            <p className="text-gray-600 mt-4">
              Call us between 10 am and 6 pm, Monday to Friday (excluding public holidays) at{" "}
              <a href="tel:+919217647849" className="text-[#FF6B6B] font-medium hover:underline">+91-9217647849</a>
            </p>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#FF6B6B] transition-colors"
                  required
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="E-mail"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#FF6B6B] transition-colors"
                  required
                />
              </div>

              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Subject"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#FF6B6B] transition-colors"
                required
              />

              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Message"
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#FF6B6B] transition-colors resize-none"
                required
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Send message"}
              </button>
            </form>
          </motion.div>

          {/* Additional Contact Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-[#FF6B6B] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email Us</h3>
              <p className="text-gray-600 text-sm">care@wellisha.com</p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-[#FF6B6B] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Call Us</h3>
              <p className="text-gray-600 text-sm">+91-9217647849</p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-[#FF6B6B] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
              <p className="text-gray-600 text-sm">
                Wellisha Essentials Pvt. Ltd.<br />Gurugram, India
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-[#FF6B6B] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Business Hours</h3>
              <p className="text-gray-600 text-sm">
                Mon - Fri: 10 AM - 6 PM
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
