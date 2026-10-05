"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag, Star } from "lucide-react";

interface ProductVariant {
  id: string;
  price: number;
  salePrice?: number | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  image: string;
  shortDescription?: string | null;
  variants?: ProductVariant[];
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (!products?.length) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">No products found</p>
        <Link
          href="/products"
          className="mt-4 inline-block text-[#FF6B6B] hover:underline"
        >
          View all products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products?.map?.((product, index) => {
        const defaultVariant = product?.variants?.[0];
        const price = defaultVariant?.price ?? 0;
        const salePrice = defaultVariant?.salePrice;
        const discount = salePrice
          ? Math.round(((price - salePrice) / price) * 100)
          : 0;

        return (
          <motion.div
            key={product?.id ?? index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Link
              href={`/products/${product?.slug ?? ""}`}
              className="group block bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
            >
              {/* Product Image */}
              <div className="relative aspect-square bg-gray-50">
                <Image
                  src={product?.image ?? "/products/wellisha-hero.jpg"}
                  alt={product?.name ?? "Product"}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {discount > 0 && (
                  <span className="absolute top-3 left-3 bg-[#FF6B6B] text-white text-xs font-bold px-2 py-1 rounded-full">
                    -{discount}%
                  </span>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                {/* Rating */}
                <div className="flex items-center mb-2">
                  {[...Array(5)]?.map?.((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className="fill-yellow-400 text-yellow-400"
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">(4.8)</span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                  {product?.name ?? "Product Name"}
                </h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {product?.shortDescription ?? "Premium quality sanitary pads"}
                </p>

                {/* Price */}
                <div className="flex items-center justify-between">
                  <div>
                    {salePrice ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[#FF6B6B]">
                          ₹{salePrice}
                        </span>
                        <span className="text-sm text-gray-400 line-through">
                          ₹{price}
                        </span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">
                        ₹{price}
                      </span>
                    )}
                  </div>
                  <div className="p-2 bg-[#FF6B6B] text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <ShoppingBag size={16} />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      }) ?? null}
    </div>
  );
}
