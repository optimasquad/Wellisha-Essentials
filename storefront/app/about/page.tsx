"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Heart,
  Shield,
  Leaf,
  Sparkles,
  Eye,
  Lightbulb,
  CheckCircle,
  ArrowRight,
  Users,
  MessageCircle,
  Target,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#FFF5F5] to-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Our <span className="text-[#FF6B6B]">Story</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Periods have always been treated like a problem to be hidden, not a
              natural rhythm to be honored. Wellisha Essentials was born to change
              that narrative for the modern Indian woman.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Born From Understanding
              </h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Every month, women quietly carry discomfort, compromise on comfort,
                and settle for products that were never truly designed for their
                lives.
              </p>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Inspired by women who juggle careers, families, ambitions, and
                self-care, we set out to create period care that understands her
                body as deeply as it respects her dreams.
              </p>
              <div className="bg-[#FFF5F5] rounded-2xl p-6 mt-6 border-l-4 border-[#FF6B6B]">
                <p className="text-gray-700 italic text-lg">
                  &ldquo;More than a product, Wellisha is a quiet promise: you can
                  move through your day with dignity, comfort, and
                  confidence—without having to slow down or apologize.&rdquo;
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative aspect-square max-w-md mx-auto"
            >
              <Image
                src="/products/wellisha-lifestyle-1.jpg"
                alt="Wellisha Essentials - Care designed for modern women"
                fill
                className="object-cover rounded-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-md"
            >
              <div className="w-14 h-14 bg-[#FF6B6B] text-white rounded-xl flex items-center justify-center mb-6">
                <Target size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Our Mission
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Our mission is to give every woman the freedom to live her fullest
                life, every day of the month, through period care that puts her
                comfort, confidence, and wellbeing first.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-md"
            >
              <div className="w-14 h-14 bg-[#FF6B6B] text-white rounded-xl flex items-center justify-center mb-6">
                <Eye size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Our Vision
              </h3>
              <p className="text-gray-600 leading-relaxed">
                We start with sanitary napkins. But our vision is to build a
                holistic feminine wellness ecosystem that supports women through
                every life stage—from the first period to menopause and beyond. We
                see a future where conversations around menstrual health are open,
                informed, and free of shame.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 bg-[#FFF5F5]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Values
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Everything we do is guided by our commitment to these core principles
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Heart,
                title: "Empathy at the Center",
                description:
                  "We listen before we design, building products around real stories, real bodies, and real needs—not assumptions.",
              },
              {
                icon: Shield,
                title: "Comfort Without Compromise",
                description:
                  "Ultra-thin, high-absorbency pads ergonomically shaped and 320 mm long for reliable day and night protection.",
              },
              {
                icon: CheckCircle,
                title: "Safety First",
                description:
                  "Our pads are dermatologically tested and created to be gentle on delicate skin, because safety should never be negotiable.",
              },
              {
                icon: Sparkles,
                title: "Confidence-First Communication",
                description:
                  "We refuse fear-based messaging. Instead, we speak the language of confidence, dignity, and self-worth.",
              },
              {
                icon: Lightbulb,
                title: "Design-Led Thinking",
                description:
                  "Period care should look and feel as elevated as any premium self-care product—where beauty meets smart function.",
              },
              {
                icon: Leaf,
                title: "Sustainability in Mind",
                description:
                  "Committed to moving towards more responsible materials and practices as we grow, supporting women and the planet.",
              },
            ]?.map?.((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-md"
              >
                <div className="w-14 h-14 bg-[#FF6B6B] text-white rounded-xl flex items-center justify-center mb-4">
                  <value.icon size={28} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {value?.title ?? ""}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {value?.description ?? ""}
                </p>
              </motion.div>
            )) ?? null}
          </div>
        </div>
      </section>

      {/* For the Modern Indian Woman */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1 relative aspect-[4/3] max-w-md mx-auto"
            >
              <Image
                src="/products/wellisha-curated.jpg"
                alt="Wellisha Curated Period Pack for the modern Indian woman"
                fill
                className="object-cover rounded-2xl"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                For the Modern Indian Woman
              </h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                She is ambitious, independent, and deeply rooted in her
                responsibilities and relationships. She wants products that
                respect both her body and her lifestyle, without forcing her to
                choose between comfort and performance.
              </p>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Wellisha Essentials is crafted for her—whether she is leading
                teams, nurturing a family, building a business, or doing it all
                at once. We stand beside her as she moves, leads, and dreams, so
                her confidence never has to pause.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center px-6 py-3 bg-[#FF6B6B] text-white font-semibold rounded-full hover:bg-[#E55A5A] transition-all"
              >
                Explore Our Products
                <ArrowRight size={18} className="ml-2" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How We Think About Periods */}
      <section className="py-16 bg-gradient-to-r from-[#FF6B6B] to-[#FF8A8A]">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-white"
          >
            <MessageCircle size={48} className="mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              How We Think About Periods
            </h2>
            <p className="text-white/90 text-lg mb-4 leading-relaxed">
              We believe periods are not a weakness, a taboo, or something to be
              whispered about. They are a sign of strength, resilience, and the
              incredible capability of the female body.
            </p>
            <p className="text-white/80 text-base leading-relaxed">
              Our role is to create products and conversations that make this
              phase of the month more comfortable, more dignified, and more openly
              accepted.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Community & Conscious Conversations */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="w-16 h-16 bg-[#FFF5F5] rounded-full flex items-center justify-center mx-auto mb-6">
              <Users size={32} className="text-[#FF6B6B]" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Community & Conscious Conversations
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Wellisha Essentials is not just a brand; it is a growing community
              of women who share stories, learn from each other, and normalize
              conversations around menstrual wellness.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              We believe in women-to-women influence—where trust is built not
              only through claims, but through real experiences and authentic
              recommendations. Over time, we aim to build ambassadors and advocates
              who carry this message of comfort and confidence into their own circles.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Looking Ahead */}
      <section className="py-16 bg-[#FFF5F5]">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Looking Ahead
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              As we grow, we plan to expand into thoughtful feminine wellness
              solutions that continue to prioritize empathy, comfort, and design.
            </p>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Every new product will follow the same philosophy: deeply listening
              to women, co-creating with experts, and never compromising on
              dignity. Wellisha Essentials is here to ensure that confidence does
              not skip a single day of the month—for any woman, anywhere.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-8 py-4 bg-[#FF6B6B] text-white font-semibold rounded-full hover:bg-[#E55A5A] transition-all shadow-lg"
            >
              Shop Wellisha
              <ArrowRight size={18} className="ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
