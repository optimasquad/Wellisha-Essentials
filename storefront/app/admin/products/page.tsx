"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Package, Search } from "lucide-react";

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  salePrice?: number | null;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  image: string;
  isActive: boolean;
  variants: ProductVariant[];
  category: { name: string };
}

export default function AdminProductsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
      fetchProducts();
    }
  }, [status, session, router]);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data?.products ?? []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setProducts(products?.filter?.((p) => p?.id !== id) ?? []);
        toast.success("Product deleted successfully");
      } else {
        toast.error("Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const filteredProducts = products?.filter?.((p) =>
    p?.name?.toLowerCase?.()?.includes?.(searchQuery?.toLowerCase?.() ?? "")
  ) ?? [];

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
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <Link
            href="/admin/products/new"
            className="px-4 py-2 bg-[#FF6B6B] text-white font-medium rounded-lg hover:bg-[#E55A5A] transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Product
          </Link>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e?.target?.value ?? "")}
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {filteredProducts?.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Stock
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
                {filteredProducts?.map?.((product, index) => {
                  const variant = product?.variants?.[0];
                  const totalStock =
                    product?.variants?.reduce?.(
                      (sum, v) => sum + (v?.stock ?? 0),
                      0
                    ) ?? 0;
                  return (
                    <motion.tr
                      key={product?.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden relative">
                            <Image
                              src={product?.image ?? "/products/wellisha-hero.jpg"}
                              alt={product?.name ?? "Product"}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <span className="font-medium">{product?.name ?? "Product"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {product?.category?.name ?? ""}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#FF6B6B] font-medium">
                          ₹{variant?.salePrice ?? variant?.price ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-medium ${
                            totalStock < 10 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {totalStock}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            product?.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {product?.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${product?.id}`}
                            className="p-2 text-gray-600 hover:text-[#FF6B6B] transition-colors"
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            onClick={() => handleDelete(product?.id ?? "")}
                            className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                }) ?? null}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No products found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
