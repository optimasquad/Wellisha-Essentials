"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Package,
  Search,
  ChevronDown,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
} from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  user: { name?: string; email: string };
  address?: { city: string; state: string };
}

const statusOptions = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="text-yellow-500" size={16} />,
  CONFIRMED: <Package className="text-blue-500" size={16} />,
  PROCESSING: <Package className="text-blue-500" size={16} />,
  SHIPPED: <Truck className="text-purple-500" size={16} />,
  DELIVERED: <CheckCircle className="text-green-500" size={16} />,
  CANCELLED: <XCircle className="text-red-500" size={16} />,
};

export default function AdminOrdersPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      if (session?.user?.role !== "ADMIN") {
        router.push("/");
        return;
      }
      fetchOrders();
    }
  }, [status, session, router]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders");
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

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setOrders(
          orders?.map?.((o) =>
            o?.id === orderId ? { ...o, status: newStatus } : o
          ) ?? []
        );
        toast.success("Order status updated");
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update status");
    }
  };

  const filteredOrders = orders?.filter?.((o) => {
    const matchesSearch =
      o?.orderNumber?.toLowerCase?.()?.includes?.(searchQuery?.toLowerCase?.() ?? "") ??
      o?.user?.email?.toLowerCase?.()?.includes?.(searchQuery?.toLowerCase?.() ?? "");
    const matchesStatus = !statusFilter || o?.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) ?? [];

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Orders</h1>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e?.target?.value ?? "")}
              placeholder="Search by order # or email..."
              className="w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e?.target?.value ?? "")}
            className="px-4 py-3 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
          >
            <option value="">All Status</option>
            {statusOptions?.map?.((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {filteredOrders?.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Order
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Payment
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders?.map?.((order, index) => (
                  <motion.tr
                    key={order?.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium">#{order?.orderNumber ?? ""}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">
                          {order?.user?.name ?? "Customer"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order?.user?.email ?? ""}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-[#FF6B6B]">
                        ₹{order?.total ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order?.paymentStatus === "PAID"
                            ? "bg-green-100 text-green-700"
                            : order?.paymentStatus === "FAILED"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {order?.paymentStatus ?? "PENDING"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <select
                          value={order?.status ?? ""}
                          onChange={(e) =>
                            updateOrderStatus(order?.id ?? "", e?.target?.value ?? "")
                          }
                          className="pl-8 pr-8 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#FF6B6B] appearance-none cursor-pointer"
                        >
                          {statusOptions?.map?.((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                          {statusIcons[order?.status ?? ""] ?? <Clock size={16} />}
                        </div>
                        <ChevronDown
                          size={14}
                          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(order?.createdAt ?? "")?.toLocaleDateString?.("en-IN") ?? ""}
                    </td>
                  </motion.tr>
                )) ?? null}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No orders found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
