import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, subtotal } = body ?? {};

    if (!code) {
      return NextResponse.json({ valid: false, error: "Code is required" }, { status: 400 });
    }

    const discount = await prisma.discountCode.findUnique({
      where: { code: code?.toUpperCase?.() ?? "" },
    });

    if (!discount) {
      return NextResponse.json({ valid: false, error: "Invalid coupon code" });
    }

    if (!discount?.isActive) {
      return NextResponse.json({ valid: false, error: "This coupon is no longer active" });
    }

    if (discount?.expiresAt && new Date(discount.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: "This coupon has expired" });
    }

    if (discount?.usageLimit && (discount?.usageCount ?? 0) >= discount.usageLimit) {
      return NextResponse.json({ valid: false, error: "This coupon has reached its usage limit" });
    }

    if (subtotal < (discount?.minOrderValue ?? 0)) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order value of ₹${discount.minOrderValue} required`,
      });
    }

    let discountAmount = 0;
    if (discount?.discountType === "PERCENTAGE") {
      discountAmount = (subtotal * (discount?.discountValue ?? 0)) / 100;
      if (discount?.maxDiscount && discountAmount > discount.maxDiscount) {
        discountAmount = discount.maxDiscount;
      }
    } else {
      discountAmount = discount?.discountValue ?? 0;
    }

    return NextResponse.json({
      valid: true,
      discount: Math.round(discountAmount),
      code: discount?.code,
      discountId: discount?.id,
    });
  } catch (error) {
    console.error("Validate discount error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
