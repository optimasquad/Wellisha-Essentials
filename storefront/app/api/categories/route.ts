import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ categories: categories ?? [] });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json({ categories: [] });
  }
}
