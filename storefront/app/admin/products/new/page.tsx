"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

interface Variant {
  name: string;
  sku: string;
  price: number;
  salePrice: number;
  stock: number;
  size: string;
  contents: string;
  isDefault: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function NewProductPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    shortDescription: "",
    image: "/products/wellisha-hero.jpg",
    categoryId: "",
    isActive: true,
    isFeatured: false,
  });
  const [variants, setVariants] = useState<Variant[]>([
    {
      name: "",
      sku: "",
      price: 0,
      salePrice: 0,
      stock: 100,
      size: "",
      contents: "",
      isDefault: true,
    },
  ]);

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
      fetchCategories();
    }
  }, [status, session, router]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data?.categories ?? []);
        if (data?.categories?.length > 0) {
          setFormData((prev) => ({ ...prev, categoryId: data.categories[0].id }));
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      ?.toLowerCase?.()
      ?.replace?.(/[^a-z0-9]+/g, "-")
      ?.replace?.(/(^-|-$)/g, "") ?? "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          slug: formData.slug || generateSlug(formData.name),
          variants: variants?.filter?.((v) => v?.name && v?.price),
        }),
      });

      if (res.ok) {
        toast.success("Product created successfully");
        router.push("/admin/products");
      } else {
        const data = await res.json();
        toast.error(data?.error ?? "Failed to create product");
      }
    } catch (error) {
      console.error("Create product error:", error);
      toast.error("Failed to create product");
    } finally {
      setIsLoading(false);
    }
  };

  const addVariant = () => {
    setVariants([
      ...variants,
      {
        name: "",
        sku: "",
        price: 0,
        salePrice: 0,
        stock: 100,
        size: "",
        contents: "",
        isDefault: false,
      },
    ]);
  };

  const removeVariant = (index: number) => {
    if (variants?.length <= 1) return;
    setVariants(variants?.filter?.((_, i) => i !== index) ?? []);
  };

  const updateVariant = (index: number, field: string, value: string | number | boolean) => {
    const updated = [...(variants ?? [])];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
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
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin/products"
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e?.target?.value ?? "",
                      slug: generateSlug(e?.target?.value ?? ""),
                    });
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e?.target?.value ?? "" })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select
                  value={formData.categoryId}
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
                  value={formData.shortDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, shortDescription: e?.target?.value ?? "" })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea
                  value={formData.description}
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
                  value={formData.image}
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
                    checked={formData.isActive}
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
                    checked={formData.isFeatured}
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

          {/* Variants */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Variants</h2>
              <button
                type="button"
                onClick={addVariant}
                className="flex items-center gap-2 text-[#FF6B6B] font-medium hover:underline"
              >
                <Plus size={18} />
                Add Variant
              </button>
            </div>
            <div className="space-y-6">
              {variants?.map?.((variant, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-medium">Variant {index + 1}</span>
                    {(variants?.length ?? 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name *</label>
                      <input
                        type="text"
                        value={variant?.name ?? ""}
                        onChange={(e) => updateVariant(index, "name", e?.target?.value ?? "")}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">SKU *</label>
                      <input
                        type="text"
                        value={variant?.sku ?? ""}
                        onChange={(e) => updateVariant(index, "sku", e?.target?.value ?? "")}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Price *</label>
                      <input
                        type="number"
                        value={variant?.price ?? 0}
                        onChange={(e) =>
                          updateVariant(index, "price", Number(e?.target?.value ?? 0))
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Sale Price</label>
                      <input
                        type="number"
                        value={variant?.salePrice ?? 0}
                        onChange={(e) =>
                          updateVariant(index, "salePrice", Number(e?.target?.value ?? 0))
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Stock</label>
                      <input
                        type="number"
                        value={variant?.stock ?? 100}
                        onChange={(e) =>
                          updateVariant(index, "stock", Number(e?.target?.value ?? 100))
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Size</label>
                      <input
                        type="text"
                        value={variant?.size ?? ""}
                        onChange={(e) => updateVariant(index, "size", e?.target?.value ?? "")}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Contents</label>
                      <input
                        type="text"
                        value={variant?.contents ?? ""}
                        onChange={(e) => updateVariant(index, "contents", e?.target?.value ?? "")}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={variant?.isDefault ?? false}
                          onChange={(e) => updateVariant(index, "isDefault", e?.target?.checked ?? false)}
                          className="accent-[#FF6B6B]"
                        />
                        Default Variant
                      </label>
                    </div>
                  </div>
                </div>
              )) ?? null}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-[#FF6B6B] text-white font-semibold rounded-lg hover:bg-[#E55A5A] transition-colors disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Product"}
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
