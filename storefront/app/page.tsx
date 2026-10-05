import { prisma } from "@/lib/db";
import { HeroSection } from "@/components/home/hero-section";
import { CategoryTabs } from "@/components/home/category-tabs";
import { FeaturedProducts } from "@/components/home/featured-products";
import { TrustSignals } from "@/components/home/trust-signals";
import { FeatureHighlights } from "@/components/home/feature-highlights";
import { PromoBanner } from "@/components/home/promo-banner";
import { CommerceCatalog } from "@/components/commerce/catalog";

export const dynamic = "force-dynamic";

async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        variants: true,
      },
      orderBy: { createdAt: "desc" },
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

export default async function HomePage() {
  if (process.env.COMMERCE_API_URL) return <div className="min-h-screen"><HeroSection /><CommerceCatalog featured /><FeatureHighlights /><TrustSignals /></div>;
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return (
    <div className="min-h-screen">
      <HeroSection />
      <CategoryTabs categories={categories ?? []} />
      <FeaturedProducts products={products ?? []} />
      <FeatureHighlights />
      <TrustSignals />
      <PromoBanner />
    </div>
  );
}
