"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  Tag,
  X,
  ShoppingCart,
} from "lucide-react";

interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    image: string;
  };
  variant: {
    id: string;
    name: string;
    price: number;
    salePrice?: number | null;
  };
}

export default function CartPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?redirect=/cart");
      return;
    }
    if (status === "authenticated") {
      fetchCart();
    }
  }, [status, router]);

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setCartItems(data?.items ?? []);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      const res = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity: newQuantity }),
      });
      if (res.ok) {
        setCartItems((items) =>
          items?.map?.((item) =>
            item?.id === itemId ? { ...item, quantity: newQuantity } : item
          ) ?? []
        );
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity");
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/cart?itemId=${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCartItems((items) => items?.filter?.((item) => item?.id !== itemId) ?? []);
        toast.success("Item removed from cart");
      }
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    }
  };

  const applyCoupon = async () => {
    if (!couponCode?.trim?.()) return;
    setIsApplyingCoupon(true);
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, subtotal }),
      });
      const data = await res.json();
      if (res.ok && data?.valid) {
        setAppliedCoupon({ code: couponCode, discount: data?.discount ?? 0 });
        toast.success(`Coupon applied! You save ₹${data?.discount ?? 0}`);
      } else {
        toast.error(data?.error ?? "Invalid coupon code");
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
      toast.error("Failed to apply coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.success("Coupon removed");
  };

  const subtotal =
    cartItems?.reduce?.((total, item) => {
      const price = item?.variant?.salePrice ?? item?.variant?.price ?? 0;
      return total + price * (item?.quantity ?? 0);
    }, 0) ?? 0;

  const discount = appliedCoupon?.discount ?? 0;
  const shipping = subtotal > 499 ? 0 : 49;
  const total = subtotal - discount + shipping;

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!cartItems?.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart size={40} className="text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-600 mb-6">Looks like you haven&apos;t added anything yet</p>
          <Link
            href="/products"
            className="inline-flex items-center px-6 py-3 bg-[#FF6B6B] text-white font-semibold rounded-full hover:bg-[#E55A5A] transition-colors"
          >
            <ShoppingBag size={18} className="mr-2" />
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cartItems?.map?.((item) => {
                const price = item?.variant?.salePrice ?? item?.variant?.price ?? 0;
                return (
                  <motion.div
                    key={item?.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="bg-white rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <Link
                        href={`/products/${item?.product?.slug ?? ""}`}
                        className="flex-shrink-0"
                      >
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={item?.product?.image ?? "/products/wellisha-hero.jpg"}
                            alt={item?.product?.name ?? "Product"}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </Link>

                      {/* Product Info */}
                      <div className="flex-1">
                        <Link href={`/products/${item?.product?.slug ?? ""}`}>
                          <h3 className="font-semibold text-gray-900 hover:text-[#FF6B6B] transition-colors">
                            {item?.product?.name ?? "Product"}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-500">
                          {item?.variant?.name ?? "Variant"}
                        </p>
                        <p className="text-lg font-bold text-[#FF6B6B] mt-1">
                          ₹{price}
                        </p>
                      </div>

                      {/* Quantity & Actions */}
                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => removeItem(item?.id ?? "")}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                        <div className="flex items-center border rounded-full">
                          <button
                            onClick={() =>
                              updateQuantity(item?.id ?? "", (item?.quantity ?? 1) - 1)
                            }
                            className="p-2 hover:bg-gray-100 rounded-l-full transition-colors"
                            disabled={(item?.quantity ?? 0) <= 1}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-10 text-center font-medium">
                            {item?.quantity ?? 0}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item?.id ?? "", (item?.quantity ?? 0) + 1)
                            }
                            className="p-2 hover:bg-gray-100 rounded-r-full transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              }) ?? null}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

              {/* Coupon Code */}
              <div className="mb-6">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-green-600" />
                      <span className="font-medium text-green-700">
                        {appliedCoupon.code}
                      </span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e?.target?.value?.toUpperCase?.() ?? "")}
                      placeholder="Enter coupon code"
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={isApplyingCoupon}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {isApplyingCoupon ? "..." : "Apply"}
                    </button>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? "FREE" : `₹${shipping}`}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-gray-500">
                    Add ₹{499 - subtotal} more for free shipping
                  </p>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-[#FF6B6B]">₹{total}</span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <Link
                href={`/checkout${appliedCoupon ? `?coupon=${appliedCoupon.code}` : ""}`}
                className="w-full py-4 bg-[#FF6B6B] text-white font-semibold rounded-full hover:bg-[#E55A5A] transition-all shadow-md flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/products"
                className="block text-center text-gray-600 hover:text-[#FF6B6B] mt-4 text-sm"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
