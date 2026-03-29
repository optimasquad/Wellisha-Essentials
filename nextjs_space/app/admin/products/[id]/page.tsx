"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  image: string;
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<Product>({
    id: "",
    name: "",
    slug: "",
    description: "",
    shortDescription: "",
    image: "",
    categoryId: "",
    isActive: true,
    isFeatured: false,
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
      fetchData();
    }
  }, [status, session, router, params?.id]);

  const fetchData = async () => {
    try {
      const [productRes, categoriesRes] = await Promise.all([
        fetch(`/api/admin/products/${params?.id ?? ""}`),
        fetch("/api/categories"),
      ]);

      if (productRes.ok) {
        const productData = await productRes.json();
        setFormData(productData?.product ?? {});
      } else {
        toast.error("Product not found");
        router.push("/admin/products");
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData?.categories ?? []);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch(`/api/admin/products/${params?.id ?? ""}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Product updated successfully");
        router.push("/admin/products");
      } else {
        const data = await res.json();
        toast.error(data?.error ?? "Failed to update product");
      }
    } catch (error) {
      console.error("Update product error:", error);
      toast.error("Failed to update product");
    } finally {
      setIsSaving(false);
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
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin/products"
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Product Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  value={formData?.name ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e?.target?.value ?? "" })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select
                  value={formData?.categoryId ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e?.target?.value ?? "" })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                  required
                >
                  {categories?.map?.((cat) => (
                    <option key={cat?.id} value={cat?.id}>
                      {cat?.name ?? "Category"}
                    </option>
                  )) ?? null}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Short Description</label>
                <input
                  type="text"
                  value={formData?.shortDescription ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, shortDescription: e?.target?.value ?? "" })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea
                  value={formData?.description ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e?.target?.value ?? "" })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B] resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <input
                  type="text"
                  value={formData?.image ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e?.target?.value ?? "" })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData?.isActive ?? true}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e?.target?.checked ?? true })
                    }
                    className="accent-[#FF6B6B]"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData?.isFeatured ?? false}
                    onChange={(e) =>
                      setFormData({ ...formData, isFeatured: e?.target?.checked ?? false })
                    }
                    className="accent-[#FF6B6B]"
                  />
                  Featured
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3 bg-[#FF6B6B] text-white font-semibold rounded-lg hover:bg-[#E55A5A] transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href="/admin/products"
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
