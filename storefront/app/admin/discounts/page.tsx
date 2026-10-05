"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Percent, Tag } from "lucide-react";

interface Discount {
  id: string;
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  expiresAt?: string;
}

export default function AdminDiscountsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minOrderValue: 0,
    maxDiscount: 0,
    usageLimit: 0,
    isActive: true,
  });

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
      fetchDiscounts();
    }
  }, [status, session, router]);

  const fetchDiscounts = async () => {
    try {
      const res = await fetch("/api/admin/discounts");
      if (res.ok) {
        const data = await res.json();
        setDiscounts(data?.discounts ?? []);
      }
    } catch (error) {
      console.error("Error fetching discounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          code: formData?.code?.toUpperCase?.() ?? "",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDiscounts([data?.discount, ...discounts]);
        setShowForm(false);
        setFormData({
          code: "",
          description: "",
          discountType: "PERCENTAGE",
          discountValue: 10,
          minOrderValue: 0,
          maxDiscount: 0,
          usageLimit: 0,
          isActive: true,
        });
        toast.success("Discount created successfully");
      } else {
        const data = await res.json();
        toast.error(data?.error ?? "Failed to create discount");
      }
    } catch (error) {
      console.error("Error creating discount:", error);
      toast.error("Failed to create discount");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this discount?")) return;

    try {
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDiscounts(discounts?.filter?.((d) => d?.id !== id) ?? []);
        toast.success("Discount deleted successfully");
      } else {
        toast.error("Failed to delete discount");
      }
    } catch (error) {
      console.error("Error deleting discount:", error);
      toast.error("Failed to delete discount");
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
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Discount Codes</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#FF6B6B] text-white font-medium rounded-lg hover:bg-[#E55A5A] transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Discount
          </button>
        </div>

        {/* Add Discount Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">Create New Discount</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e?.target?.value ?? "" })
                    }
                    placeholder="e.g., WELCOME15"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({ ...formData, discountType: e?.target?.value ?? "" })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountValue: Number(e?.target?.value ?? 0),
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Minimum Order Value
                  </label>
                  <input
                    type="number"
                    value={formData.minOrderValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minOrderValue: Number(e?.target?.value ?? 0),
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e?.target?.value ?? "" })
                  }
                  placeholder="e.g., 15% off for new customers"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#FF6B6B] text-white font-medium rounded-lg hover:bg-[#E55A5A] transition-colors"
                >
                  Create Discount
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Discounts Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {discounts?.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Discount
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Min. Order
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Usage
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {discounts?.map?.((discount, index) => (
                  <motion.tr
                    key={discount?.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tag size={16} className="text-[#FF6B6B]" />
                        <span className="font-medium">{discount?.code ?? ""}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-[#FF6B6B]">
                        {discount?.discountType === "PERCENTAGE"
                          ? `${discount?.discountValue ?? 0}%`
                          : `₹${discount?.discountValue ?? 0}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      ₹{discount?.minOrderValue ?? 0}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {discount?.usageCount ?? 0}
                      {discount?.usageLimit
                        ? ` / ${discount.usageLimit}`
                        : " / ∞"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          discount?.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {discount?.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDelete(discount?.id ?? "")}
                          className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )) ?? null}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center">
              <Percent size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No discount codes yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
