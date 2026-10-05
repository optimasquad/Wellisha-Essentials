import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/products/product-detail";
import { CommerceProductDetail } from "@/components/commerce/product-detail";

export const dynamic = "force-dynamic";

async function getProduct(slug: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: true,
      },
    });
    return product ?? null;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

async function getRelatedProducts(categoryId: string, currentId: string) {
  try {
    const products = await prisma.product.findMany({
      where: {
        categoryId,
        id: { not: currentId },
        isActive: true,
      },
      include: { variants: true },
      take: 4,
    });
    return products ?? [];
  } catch (error) {
    console.error("Error fetching related products:", error);
    return [];
  }
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  if (process.env.COMMERCE_API_URL) return <CommerceProductDetail slug={params.slug} />;
  const product = await getProduct(params?.slug ?? "");

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(
    product?.categoryId ?? "",
    product?.id ?? ""
  );

  return <ProductDetail product={product} relatedProducts={relatedProducts ?? []} />;
}
