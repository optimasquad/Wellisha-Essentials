import { prisma } from "@/lib/db";
import { ProductGrid } from "@/components/products/product-grid";
import { ProductFilters } from "@/components/products/product-filters";
import { CommerceCatalog } from "@/components/commerce/catalog";

export const dynamic = "force-dynamic";

interface SearchParams {
  category?: string;
  search?: string;
  sort?: string;
}

async function getProducts(searchParams: SearchParams) {
  try {
    const where: Record<string, unknown> = { isActive: true };

    if (searchParams?.category) {
      where.category = { slug: searchParams.category };
    }

    if (searchParams?.search) {
      where.OR = [
        { name: { contains: searchParams.search, mode: "insensitive" } },
        { description: { contains: searchParams.search, mode: "insensitive" } },
      ];
    }

    const orderBy: Record<string, string> = {};
    if (searchParams?.sort === "price-asc") {
      orderBy.createdAt = "asc";
    } else if (searchParams?.sort === "price-desc") {
      orderBy.createdAt = "desc";
    } else {
      orderBy.createdAt = "desc";
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: true,
      },
      orderBy,
    });

    return products ?? [];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return categories ?? [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (process.env.COMMERCE_API_URL) return <CommerceCatalog key={JSON.stringify(searchParams)} filters={searchParams} />;
  const [products, categories] = await Promise.all([
    getProducts(searchParams ?? {}),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            {searchParams?.category
              ? categories?.find?.((c) => c?.slug === searchParams.category)?.name ?? "Products"
              : searchParams?.search
              ? `Search: "${searchParams.search}"`
              : "All Products"}
          </h1>
          <p className="text-gray-600">
            Discover our range of premium period care products
          </p>
        </div>

        {/* Filters and Products */}
        <ProductFilters categories={categories ?? []} />
        <ProductGrid products={products ?? []} />
      </div>
    </div>
  );
}
