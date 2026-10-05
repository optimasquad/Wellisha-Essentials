"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    image: string;
  };
  variant: {
    name: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
}

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="text-yellow-500" size={20} />,
  CONFIRMED: <Package className="text-blue-500" size={20} />,
  PROCESSING: <Package className="text-blue-500" size={20} />,
  SHIPPED: <Truck className="text-purple-500" size={20} />,
  DELIVERED: <CheckCircle className="text-green-500" size={20} />,
  CANCELLED: <XCircle className="text-red-500" size={20} />,
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function OrdersPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?redirect=/account/orders");
      return;
    }
    if (status === "authenticated") {
      fetchOrders();
    }
  }, [status, router]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data?.orders ?? []);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

        {orders?.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag size={40} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No orders yet
            </h2>
            <p className="text-gray-600 mb-6">
              Start shopping to see your orders here
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 bg-[#FF6B6B] text-white font-semibold rounded-full hover:bg-[#E55A5A] transition-colors"
            >
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders?.map?.((order, index) => (
              <motion.div
                key={order?.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Order #{order?.orderNumber ?? ""}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order?.createdAt ?? "")?.toLocaleDateString?.("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }) ?? ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcons[order?.status ?? ""] ?? <Clock size={20} />}
                    <span
                      className={`text-sm font-medium ${
                        order?.status === "DELIVERED"
                          ? "text-green-600"
                          : order?.status === "CANCELLED"
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {statusLabels[order?.status ?? ""] ?? "Unknown"}
                    </span>
                  </div>
                </div>

                {/* Order Items Preview */}
                <div className="flex gap-4 mb-4 overflow-x-auto pb-2">
                  {order?.items?.slice?.(0, 3)?.map?.((item) => (
                    <div
                      key={item?.id}
                      className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden relative"
                    >
                      <Image
                        src={item?.product?.image ?? "/products/wellisha-hero.jpg"}
                        alt={item?.product?.name ?? "Product"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )) ?? null}
                  {(order?.items?.length ?? 0) > 3 && (
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm text-gray-500">
                        +{(order?.items?.length ?? 0) - 3}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="font-semibold text-lg">
                    Total: <span className="text-[#FF6B6B]">₹{order?.total ?? 0}</span>
                  </p>
                  <Link
                    href={`/account/orders/${order?.id ?? ""}`}
                    className="flex items-center gap-1 text-[#FF6B6B] font-medium hover:underline"
                  >
                    View Details
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </motion.div>
            )) ?? null}
          </div>
        )}
      </div>
    </div>
  );
}
