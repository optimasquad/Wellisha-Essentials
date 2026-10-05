import { NextResponse } from "next/server";
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

    const [totalOrders, totalProducts, totalUsers, revenueResult, recentOrders] =
      await Promise.all([
        prisma.order.count(),
        prisma.product.count(),
        prisma.user.count(),
        prisma.order.aggregate({
          _sum: { total: true },
          where: { paymentStatus: "PAID" },
        }),
        prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        }),
      ]);

    return NextResponse.json({
      totalOrders: totalOrders ?? 0,
      totalRevenue: revenueResult?._sum?.total ?? 0,
      totalProducts: totalProducts ?? 0,
      totalUsers: totalUsers ?? 0,
      recentOrders: recentOrders ?? [],
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
