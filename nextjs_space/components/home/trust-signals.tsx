"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Ruler, Stethoscope, Shield, Wind } from "lucide-react";

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {count?.toLocaleString?.() ?? "0"}{suffix}
    </span>
  );
}

const whyWellishaData = [
  {
    icon: Stethoscope,
    title: "Designed with Gynaecologists",
    description:
      "Our pads are shaped to follow the body's natural contours, improving comfort, reducing bunching, and helping prevent leaks.",
  },
  {
    icon: Ruler,
    title: "320 mm Length for Day & Night",
    description:
      "One pad that works for long days, busy travel, or restful nights—giving dependable coverage when she needs it most.",
  },
  {
    icon: Shield,
    title: "Dermatologically Tested",
    description:
      "Gentle on sensitive skin, minimizing the risk of irritation for worry-free, all-day wear.",
  },
  {
    icon: Wind,
    title: "Soft, Dry & Breathable",
    description:
      "Thoughtful layering aims to keep her feeling dry and fresh, so she can stay focused on life—not her pad.",
  },
];

export function TrustSignals() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Why <span className="text-[#FF6B6B]">Wellisha</span> Pads?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            For women who are always on the move—at work, at home, on the road—Wellisha
            offers quiet, reliable support that adapts to her pace.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {whyWellishaData?.map?.((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-[#FFF5F5] rounded-2xl p-6 text-center"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 bg-[#FF6B6B] text-white rounded-full mb-4">
                <item.icon size={28} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {item?.title ?? ""}
              </h3>
              <p className="text-gray-600 text-sm">{item?.description ?? ""}</p>
            </motion.div>
          )) ?? null}
        </div>
      </div>
    </section>
  );
}
