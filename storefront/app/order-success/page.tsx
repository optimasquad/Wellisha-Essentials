"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, Package, Home, ShoppingBag } from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get?.("orderId") ?? "";
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data?.order ?? null);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle size={48} className="text-green-600" />
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Order Placed Successfully!
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for your order. We&apos;ll send you updates on your order status.
        </p>

        {order && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Package size={18} className="text-[#FF6B6B]" />
              <span className="font-semibold">Order #{order?.orderNumber ?? ""}</span>
            </div>
            <p className="text-2xl font-bold text-[#FF6B6B]">
              ₹{order?.total ?? 0}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/account/orders"
            className="flex-1 py-3 bg-[#FF6B6B] text-white font-semibold rounded-full hover:bg-[#E55A5A] transition-colors flex items-center justify-center gap-2"
          >
            <Package size={18} />
            Track Order
          </Link>
          <Link
            href="/"
            className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Go Home
          </Link>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-[#FF6B6B] font-medium mt-6 hover:underline"
        >
          <ShoppingBag size={16} />
          Continue Shopping
        </Link>
      </motion.div>
    </div>
  );
}
