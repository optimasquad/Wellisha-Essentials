"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Box,
  Percent,
  LayoutDashboard,
} from "lucide-react";

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
    user: { name?: string; email: string };
  }>;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      fetchStats();
    }
  }, [status, session, router]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data ?? null);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
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

  if (session?.user?.role !== "ADMIN") {
    return null;
  }

  const statCards = [
    {
      title: "Total Orders",
      value: stats?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: "bg-blue-500",
      href: "/admin/orders",
    },
    {
      title: "Total Revenue",
      value: `₹${(stats?.totalRevenue ?? 0)?.toLocaleString?.()}`,
      icon: DollarSign,
      color: "bg-green-500",
      href: "/admin/orders",
    },
    {
      title: "Products",
      value: stats?.totalProducts ?? 0,
      icon: Package,
      color: "bg-purple-500",
      href: "/admin/products",
    },
    {
      title: "Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "bg-[#FF6B6B]",
      href: "/admin",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome back, {session?.user?.name ?? "Admin"}</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/products/new"
              className="px-4 py-2 bg-[#FF6B6B] text-white font-medium rounded-lg hover:bg-[#E55A5A] transition-colors flex items-center gap-2"
            >
              <Package size={18} />
              Add Product
            </Link>
            <Link
              href="/admin/discounts/new"
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Percent size={18} />
              Add Discount
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards?.map?.((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={stat?.href ?? "#"}
                className="block bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat?.title ?? ""}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stat?.value ?? 0}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 ${stat?.color ?? "bg-gray-500"} rounded-xl flex items-center justify-center text-white`}
                  >
                    <stat.icon size={24} />
                  </div>
                </div>
              </Link>
            </motion.div>
          )) ?? null}
        </div>

        {/* Quick Links and Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Links */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
            <div className="space-y-3">
              <Link
                href="/admin/products"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Box size={20} className="text-[#FF6B6B]" />
                  <span>Manage Products</span>
                </div>
                <ArrowRight size={16} className="text-gray-400" />
              </Link>
              <Link
                href="/admin/orders"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart size={20} className="text-[#FF6B6B]" />
                  <span>View Orders</span>
                </div>
                <ArrowRight size={16} className="text-gray-400" />
              </Link>
              <Link
                href="/admin/discounts"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Percent size={20} className="text-[#FF6B6B]" />
                  <span>Manage Discounts</span>
                </div>
                <ArrowRight size={16} className="text-gray-400" />
              </Link>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Orders</h2>
              <Link
                href="/admin/orders"
                className="text-[#FF6B6B] text-sm font-medium hover:underline"
              >
                View All
              </Link>
            </div>
            {stats?.recentOrders?.length ? (
              <div className="space-y-4">
                {stats?.recentOrders?.slice?.(0, 5)?.map?.((order) => (
                  <div
                    key={order?.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">#{order?.orderNumber ?? ""}</p>
                      <p className="text-sm text-gray-500">
                        {order?.user?.name ?? order?.user?.email ?? "Customer"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#FF6B6B]">
                        ₹{order?.total ?? 0}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          order?.status === "DELIVERED"
                            ? "text-green-600"
                            : order?.status === "CANCELLED"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {order?.status ?? "PENDING"}
                      </p>
                    </div>
                  </div>
                )) ?? null}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No orders yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
