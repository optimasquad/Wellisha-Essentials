"use client";

import { motion } from "framer-motion";
import { Sparkles, Heart, Shield, Droplets, Stethoscope } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Clean, Chemical-Free Care",
    description: "No unnecessary chemicals. Just better care for you.",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    icon: Heart,
    title: "Gentle on Skin",
    description: "Soft cottony comfort for your skin. Dermatologically tested for worry-free, all-day wear.",
    color: "text-[#FF6B6B]",
    bgColor: "bg-[#FFF5F5]",
  },
  {
    icon: Shield,
    title: "Leak Secure Design",
    description: "Smart absorption for worry-free movement all day. 320 mm length for day & night.",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: Droplets,
    title: "Reliable Protection",
    description: "Stay dry and confident every day. Thoughtful layering keeps you feeling fresh.",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
  },
  {
    icon: Stethoscope,
    title: "Designed with Experts",
    description: "Thoughtfully shaped with Gynaecologists for comfort. Ergonomically designed to follow the body's natural contours.",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
];

export function FeatureHighlights() {
  return (
    <section className="py-16 bg-gradient-to-br from-[#FFF5F5] to-white">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            The <span className="text-[#FF6B6B]">Wellisha</span> Promise
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We believe that every period should be simple, safe, and comfortable.
            That&apos;s why we use clean, thoughtfully selected ingredients—and leave out anything unnecessary.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features?.map?.((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 ${
                index === 4 ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
            >
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 ${feature?.bgColor ?? "bg-gray-50"}`}
              >
                <feature.icon size={28} className={feature?.color ?? "text-gray-600"} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature?.title ?? "Feature"}
              </h3>
              <p className="text-gray-600">
                {feature?.description ?? "Description"}
              </p>
            </motion.div>
          )) ?? null}
        </div>

        {/* Believe Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <div className="inline-flex flex-wrap justify-center gap-4">
            <span className="bg-red-50 text-red-700 px-5 py-2 rounded-full text-sm font-medium">
              NO Harsh Chemicals
            </span>
            <span className="bg-red-50 text-red-700 px-5 py-2 rounded-full text-sm font-medium">
              NO Synthetic Additives
            </span>
            <span className="bg-green-50 text-green-700 px-5 py-2 rounded-full text-sm font-medium">
              Just Gentle Protection You Can Trust
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
