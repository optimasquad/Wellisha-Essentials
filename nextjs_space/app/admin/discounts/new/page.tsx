"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewDiscountPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

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
        toast.success("Discount created successfully");
        router.push("/admin/discounts");
      } else {
        const data = await res.json();
        toast.error(data?.error ?? "Failed to create discount");
      }
    } catch (error) {
      console.error("Create discount error:", error);
      toast.error("Failed to create discount");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin/discounts"
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Add New Discount</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Discount Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e?.target?.value ?? "" })
                  }
                  placeholder="e.g., WELCOME15"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B] uppercase"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount Type *</label>
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
                    Discount Value * ({formData.discountType === "PERCENTAGE" ? "%" : "₹"})
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Minimum Order Value (₹)</label>
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
                <div>
                  <label className="block text-sm font-medium mb-1">Max Discount (₹)</label>
                  <input
                    type="number"
                    value={formData.maxDiscount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxDiscount: Number(e?.target?.value ?? 0),
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Usage Limit (0 = Unlimited)</label>
                <input
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      usageLimit: Number(e?.target?.value ?? 0),
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e?.target?.checked ?? true })
                    }
                    className="accent-[#FF6B6B]"
                  />
                  Active
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-[#FF6B6B] text-white font-semibold rounded-lg hover:bg-[#E55A5A] transition-colors disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Discount"}
            </button>
            <Link
              href="/admin/discounts"
              className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
