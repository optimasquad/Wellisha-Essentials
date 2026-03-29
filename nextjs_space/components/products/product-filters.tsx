"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Filter, ChevronDown } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export function ProductFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortOpen, setSortOpen] = useState(false);

  const currentCategory = searchParams?.get?.("category") ?? "";
  const currentSort = searchParams?.get?.("sort") ?? "";

  const handleCategoryChange = (slug: string) => {
    const params = new URLSearchParams(searchParams?.toString?.() ?? "");
    if (slug) {
      params.set("category", slug);
    } else {
      params.delete("category");
    }
    router.push(`/products?${params.toString()}`);
  };

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams?.toString?.() ?? "");
    if (sort) {
      params.set("sort", sort);
    } else {
      params.delete("sort");
    }
    router.push(`/products?${params.toString()}`);
    setSortOpen(false);
  };

  const sortOptions = [
    { value: "", label: "Latest" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={18} className="text-gray-500" />
        <button
          onClick={() => handleCategoryChange("")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            !currentCategory
              ? "bg-[#FF6B6B] text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          All
        </button>
        {categories?.filter?.((c) => c?.isActive)?.map?.((category) => (
          <button
            key={category?.id}
            onClick={() => handleCategoryChange(category?.slug ?? "")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              currentCategory === category?.slug
                ? "bg-[#FF6B6B] text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {category?.name ?? "Category"}
          </button>
        )) ?? null}
      </div>

      {/* Sort Dropdown */}
      <div className="relative">
        <button
          onClick={() => setSortOpen(!sortOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Sort by: {sortOptions?.find?.((o) => o?.value === currentSort)?.label ?? "Latest"}
          <ChevronDown size={16} className={`transition-transform ${sortOpen ? "rotate-180" : ""}`} />
        </button>
        {sortOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-10">
            {sortOptions?.map?.((option) => (
              <button
                key={option?.value}
                onClick={() => handleSortChange(option?.value ?? "")}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                  currentSort === option?.value
                    ? "text-[#FF6B6B] font-medium"
                    : "text-gray-700"
                }`}
              >
                {option?.label ?? "Option"}
              </button>
            )) ?? null}
          </div>
        )}
      </div>
    </div>
  );
}
