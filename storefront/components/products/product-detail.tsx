"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ShoppingCart,
  Star,
  Shield,
  Leaf,
  Heart,
  Check,
  Minus,
  Plus,
  ChevronDown,
  ChevronUp,
  Truck,
  RotateCcw,
} from "lucide-react";

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  salePrice?: number | null;
  size?: string | null;
  contents?: string | null;
  stock: number;
  isDefault: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  image: string;
  images: string[];
  variants: ProductVariant[];
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  image: string;
  variants: ProductVariant[];
}

export function ProductDetail({
  product,
  relatedProducts,
}: {
  product: Product;
  relatedProducts: RelatedProduct[];
}) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    product?.variants?.find?.((v) => v?.isDefault) ?? product?.variants?.[0] ?? ({} as ProductVariant)
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(product?.image ?? "");
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const price = selectedVariant?.price ?? 0;
  const salePrice = selectedVariant?.salePrice;
  const discount = salePrice ? Math.round(((price - salePrice) / price) * 100) : 0;
  const finalPrice = salePrice ?? price;

  const allImages = [product?.image, ...(product?.images ?? [])]?.filter?.(Boolean) ?? [];

  const handleAddToCart = async () => {
    if (!session?.user) {
      router.push("/login");
      return;
    }

    setIsAddingToCart(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product?.id,
          variantId: selectedVariant?.id,
          quantity,
        }),
      });

      if (res.ok) {
        toast.success("Added to cart!");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data?.error ?? "Failed to add to cart");
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const faqs = [
    {
      question: "What makes Wellisha pads different?",
      answer:
        "Wellisha pads are made from 100% U.S. Cotton, making them incredibly soft and rash-free. They're also chlorine-free, fragrance-free, and designed for maximum comfort.",
    },
    {
      question: "Are Wellisha pads suitable for sensitive skin?",
      answer:
        "Absolutely! Our pads are specifically designed for sensitive skin. We offer a 100% money-back guarantee if you experience any rashes.",
    },
    {
      question: "What sizes are available?",
      answer:
        "We offer XL (280mm) for regular flow, XXL (320mm) for heavy flow, XXXL (410mm) for overnight/very heavy flow, and curated packs for variety.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/" className="text-gray-500 hover:text-[#FF6B6B]">
                Home
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/products" className="text-gray-500 hover:text-[#FF6B6B]">
                Products
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium">{product?.name ?? "Product"}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-4">
              <Image
                src={selectedImage || product?.image || "/products/wellisha-hero.jpg"}
                alt={product?.name ?? "Product"}
                fill
                className="object-cover"
                priority
              />
              {discount > 0 && (
                <span className="absolute top-4 left-4 bg-[#FF6B6B] text-white text-sm font-bold px-3 py-1 rounded-full">
                  -{discount}% OFF
                </span>
              )}
            </div>
            {/* Thumbnail Gallery */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {allImages?.map?.((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(img ?? "")}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === img
                      ? "border-[#FF6B6B]"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={img ?? "/products/wellisha-hero.jpg"}
                      alt={`${product?.name ?? "Product"} - ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                </button>
              )) ?? null}
            </div>
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {/* Rating */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex">
                {[...Array(5)]?.map?.((_, i) => (
                  <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm text-gray-600">(4.8) 1,049 reviews</span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {product?.name ?? "Product Name"}
            </h1>
            <p className="text-gray-600 mb-6">
              {product?.shortDescription ?? product?.description ?? "Description"}
            </p>

            {/* Price */}
            <div className="flex items-center gap-4 mb-6">
              {salePrice ? (
                <>
                  <span className="text-3xl font-bold text-[#FF6B6B]">
                    ₹{salePrice}
                  </span>
                  <span className="text-xl text-gray-400 line-through">₹{price}</span>
                  <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                    Save {discount}%
                  </span>
                </>
              ) : (
                <span className="text-3xl font-bold text-gray-900">₹{price}</span>
              )}
            </div>

            {/* Variant Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Size</h3>
              <div className="flex flex-wrap gap-3">
                {product?.variants?.map?.((variant) => (
                  <button
                    key={variant?.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-4 py-3 rounded-xl border-2 transition-all ${
                      selectedVariant?.id === variant?.id
                        ? "border-[#FF6B6B] bg-[#FFF5F5]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="font-medium text-gray-900">{variant?.name ?? "Variant"}</span>
                    {variant?.contents && (
                      <span className="block text-xs text-gray-500 mt-1">
                        {variant.contents}
                      </span>
                    )}
                  </button>
                )) ?? null}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quantity</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center border rounded-full">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-gray-100 rounded-l-full transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-12 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-gray-100 rounded-r-full transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <span className="text-gray-500 text-sm">
                  Stock: {selectedVariant?.stock ?? 0} available
                </span>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart || (selectedVariant?.stock ?? 0) < 1}
              className="w-full py-4 bg-[#FF6B6B] text-white font-semibold rounded-full hover:bg-[#E55A5A] transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6"
            >
              <ShoppingCart size={20} />
              {isAddingToCart ? "Adding..." : "Add to Cart"}
            </button>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Truck size={18} className="text-[#FF6B6B]" />
                Free shipping above ₹499
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <RotateCcw size={18} className="text-[#FF6B6B]" />
                Easy returns
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield size={18} className="text-[#FF6B6B]" />
                100% Rash-free guarantee
              </div>
            </div>

            {/* Features */}
            <div className="bg-[#FFF5F5] rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">Product Features</h3>
              <ul className="space-y-3">
                {[
                  "100% U.S. Cotton - Super soft & breathable",
                  "Leak-proof protection for up to 12 hours",
                  "Chlorine & fragrance-free",
                  "No artificial colors or harsh chemicals",
                  "Money-back guarantee if rashes occur",
                ]?.map?.((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* FAQs */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
              <div className="space-y-3">
                {faqs?.map?.((faq, index) => (
                  <div key={index} className="border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900">{faq?.question ?? "Question"}</span>
                      {openFaq === index ? (
                        <ChevronUp size={18} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                      )}
                    </button>
                    {openFaq === index && (
                      <div className="px-4 pb-4 text-gray-600">{faq?.answer ?? "Answer"}</div>
                    )}
                  </div>
                )) ?? null}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Related Products */}
        {relatedProducts?.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts?.map?.((relProduct) => {
                const variant = relProduct?.variants?.[0];
                return (
                  <Link
                    key={relProduct?.id}
                    href={`/products/${relProduct?.slug ?? ""}`}
                    className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all"
                  >
                    <div className="relative aspect-square bg-gray-50">
                      <Image
                        src={relProduct?.image ?? "/products/wellisha-hero.jpg"}
                        alt={relProduct?.name ?? "Product"}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 line-clamp-1">
                        {relProduct?.name ?? "Product"}
                      </h3>
                      <p className="text-[#FF6B6B] font-semibold">
                        ₹{variant?.salePrice ?? variant?.price ?? 0}
                      </p>
                    </div>
                  </Link>
                );
              }) ?? null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
