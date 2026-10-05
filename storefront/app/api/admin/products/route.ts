import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products: products ?? [] });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      description,
      shortDescription,
      image,
      images,
      categoryId,
      isActive,
      isFeatured,
      variants,
    } = body ?? {};

    if (!name || !slug || !categoryId) {
      return NextResponse.json(
        { error: "Name, slug, and category are required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description ?? "",
        shortDescription,
        image: image ?? "/products/wellisha-hero.jpg",
        images: images ?? [],
        categoryId,
        isActive: isActive ?? true,
        isFeatured: isFeatured ?? false,
        variants: {
          create:
            variants?.map?.((v: {
              name: string;
              sku: string;
              price: number;
              salePrice?: number;
              stock?: number;
              size?: string;
              contents?: string;
              isDefault?: boolean;
            }) => ({
              name: v?.name ?? "",
              sku: v?.sku ?? `SKU-${Date.now()}`,
              price: v?.price ?? 0,
              salePrice: v?.salePrice ?? null,
              stock: v?.stock ?? 100,
              size: v?.size ?? null,
              contents: v?.contents ?? null,
              isDefault: v?.isDefault ?? false,
            })) ?? [],
        },
      },
      include: { variants: true },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
