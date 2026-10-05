"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, ArrowRight, BookOpen } from "lucide-react";

export default function BlogPage() {
  const blogPosts = [
    {
      id: 1,
      title: "Understanding Your Menstrual Cycle: A Complete Guide",
      excerpt:
        "Learn about the different phases of your menstrual cycle and how to track them effectively.",
      image: "/products/wellisha-lifestyle-2.jpg",
      date: "Feb 15, 2026",
      readTime: "5 min read",
    },
    {
      id: 2,
      title: "Why 100% Cotton Matters for Period Care",
      excerpt:
        "Discover why choosing cotton-based sanitary products can make a difference for your health.",
      image: "/products/wellisha-lifestyle-3.jpg",
      date: "Feb 10, 2026",
      readTime: "4 min read",
    },
    {
      id: 3,
      title: "Tips for Managing Period Discomfort Naturally",
      excerpt:
        "Simple and effective ways to ease period cramps and discomfort without medication.",
      image: "/products/wellisha-hero.jpg",
      date: "Feb 5, 2026",
      readTime: "6 min read",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#FFF5F5] to-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Wellisha <span className="text-[#FF6B6B]">Blog</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Insights, tips, and stories about period care and women&apos;s wellness
            </p>
          </motion.div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts?.map?.((post, index) => (
              <motion.article
                key={post?.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="relative aspect-video bg-gray-100">
                  <Image
                    src={post?.image ?? "/products/wellisha-hero.jpg"}
                    alt={post?.title ?? "Blog post"}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span>{post?.date ?? ""}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {post?.readTime ?? ""}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-[#FF6B6B] transition-colors">
                    {post?.title ?? "Blog Post"}
                  </h2>
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {post?.excerpt ?? ""}
                  </p>
                  <span className="flex items-center gap-2 text-[#FF6B6B] font-medium group-hover:underline">
                    Read Article
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </motion.article>
            )) ?? null}
          </div>

          {/* Coming Soon Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-16 text-center bg-white rounded-2xl p-12 shadow-sm"
          >
            <BookOpen size={48} className="mx-auto text-[#FF6B6B] mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              More Content Coming Soon!
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              We&apos;re working on bringing you more helpful articles about period
              care, wellness tips, and women&apos;s health.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
