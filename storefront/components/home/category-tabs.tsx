"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Droplets, Scissors, Heart, Sparkles } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

const categoryIcons: { [key: string]: React.ReactNode } = {
  "period-care": <Droplets size={24} />,
  "hair-removal": <Scissors size={24} />,
  "intimate-wellness": <Heart size={24} />,
  "skin-care": <Sparkles size={24} />,
};

const defaultCategories = [
  { id: "1", name: "Period Care", slug: "period-care", isActive: true },
  { id: "2", name: "Hair Removal", slug: "hair-removal", isActive: false },
  { id: "3", name: "Intimate Wellness", slug: "intimate-wellness", isActive: false },
  { id: "4", name: "Skin Care", slug: "skin-care", isActive: false },
];

export function CategoryTabs({ categories }: { categories: Category[] }) {
  const displayCategories = categories?.length > 0 ? categories : defaultCategories;

  return (
    <section className="py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-4">
          {displayCategories?.map?.((category, index) => (
            <motion.div
              key={category?.id ?? index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              {category?.isActive ? (
                <Link
                  href={`/products?category=${category?.slug ?? ""}`}
                  className="flex items-center px-6 py-3 bg-[#FF6B6B] text-white rounded-full font-medium shadow-md hover:shadow-lg transition-all"
                >
                  {categoryIcons[category?.slug ?? ""] ?? <Droplets size={24} />}
                  <span className="ml-2">{category?.name ?? "Category"}</span>
                </Link>
              ) : (
                <div className="flex items-center px-6 py-3 bg-gray-100 text-gray-400 rounded-full font-medium cursor-not-allowed">
                  {categoryIcons[category?.slug ?? ""] ?? <Droplets size={24} />}
                  <span className="ml-2">{category?.name ?? "Category"}</span>
                  <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full">Soon</span>
                </div>
              )}
            </motion.div>
          )) ?? null}
        </div>
      </div>
    </section>
  );
}
