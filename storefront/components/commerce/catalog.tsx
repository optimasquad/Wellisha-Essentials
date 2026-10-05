"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useLiveCommerce } from "@/hooks/use-live-commerce";
import { formatMinor, isCatalogPage, isCategories } from "@/lib/catalog-data";
import type { ProductView } from "@/lib/generated/commerce-types";

export function ProductPrice({ product }: { product: ProductView }) {
  return <div className="space-y-1"><div className="flex gap-2 items-baseline"><span className="text-xl font-semibold">{formatMinor(product.priceMinor)}</span>
    {product.discountMinor > 0 && <del className="text-sm text-gray-500">{formatMinor(product.basePriceMinor)}</del>}</div>
    {product.offerTitle && <p className="text-sm text-purple-800 font-medium">{product.offerTitle}</p>}
    {product.offerSummary && <p className="text-sm text-gray-600">{product.offerSummary}</p>}</div>;
}
export function CommerceCatalog({ filters = {}, featured = false }: { filters?: { category?: string; search?: string; sort?: string }; featured?: boolean }) {
  const [page, setPage] = useState(0);
  const query = new URLSearchParams({ page: String(page), size: featured ? "8" : "24", sort: filters.sort || "latest" });
  if (filters.category) query.set("category",filters.category);
  if (filters.search) query.set("search",filters.search);
  const live = useLiveCommerce("/api/catalog?" + query.toString(),isCatalogPage);
  const categories = useLiveCommerce("/api/catalog/categories",isCategories);
  return <section className="max-w-7xl mx-auto px-4 py-10" aria-labelledby="catalog-title">
    <div className="flex items-baseline justify-between gap-4 mb-6"><h1 id="catalog-title" className="text-3xl font-bold">{featured ? "Shop Wellisha" : filters.search ? `Search: ${filters.search}` : "Our products"}</h1><Link href="/cart" className="underline">Your cart</Link></div>
    {!featured && <div className="flex flex-wrap gap-3 items-center mb-6"><Link href="/products" className="rounded-full border px-4 py-2">All</Link>{categories.data?.map(c => <Link key={c.id} href={"/products?category="+encodeURIComponent(c.slug)} className="rounded-full border px-4 py-2">{c.name}</Link>)}
      <form action="/products" className="flex gap-2"><input name="search" defaultValue={filters.search} maxLength={120} placeholder="Search products" aria-label="Search products" className="border rounded-lg p-2" />{filters.category && <input type="hidden" name="category" value={filters.category} />}
      <select name="sort" defaultValue={filters.sort || "latest"} aria-label="Sort products" className="border rounded-lg p-2"><option value="latest">Catalog order</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select><button className="rounded-lg bg-purple-800 text-white px-4">Apply</button></form></div>}
    {live.error && <div role="alert" className="mb-6 rounded-xl border p-4">{live.error} <button onClick={live.refresh} className="underline">Retry</button></div>}
    {!live.data && live.loading && <p role="status">Loading products...</p>}
    {live.data && !live.data.items.length && <p>No products match your selection.</p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{live.data?.items.map(product => <Link key={product.id} href={"/products/"+encodeURIComponent(product.slug)} className="block rounded-2xl border bg-white overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-square bg-rose-50"><Image src={product.image.startsWith("/") && !product.image.startsWith("//") ? product.image : "/products/wellisha-hero.jpg"} alt={product.name} fill className="object-cover" /></div>
      <div className="p-5 space-y-3"><h2 className="font-semibold text-lg">{product.name}</h2><p className="text-sm text-gray-600 line-clamp-2">{product.description}</p><ProductPrice product={product} />{!product.available && <p className="text-sm text-gray-600">Sold out</p>}</div>
    </Link>)}</div>
    {!featured && live.data && <nav aria-label="Catalog pages" className="flex justify-between mt-8"><button disabled={page===0} onClick={() => setPage(p=>p-1)} className="underline disabled:opacity-30">Previous</button><span>Page {page+1}</span><button disabled={!live.data.hasMore} onClick={() => setPage(p=>p+1)} className="underline disabled:opacity-30">Next</button></nav>}
    {featured && <Link href="/products" className="inline-block mt-6 underline font-medium">View all products</Link>}
  </section>;
}
