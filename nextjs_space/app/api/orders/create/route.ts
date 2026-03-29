import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Razorpay from "razorpay";

export const dynamic = "force-dynamic";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID ?? "",
  key_secret: process.env.RAZORPAY_KEY_SECRET ?? "",
});

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WE${timestamp}${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { addressId, discountId, discount = 0 } = body ?? {};

    if (!addressId) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Get cart items
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart?.items?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = cart.items.map((item) => {
      const price = item?.variant?.salePrice ?? item?.variant?.price ?? 0;
      const itemTotal = price * (item?.quantity ?? 0);
      subtotal += itemTotal;
      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: price,
        total: itemTotal,
      };
    });

    const shipping = subtotal > 499 ? 0 : 49;
    const total = subtotal - discount + shipping;

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total * 100), // Amount in paise
      currency: "INR",
      receipt: generateOrderNumber(),
    });

    // Create order in database
    const order = await prisma.order.create({
      data: {
        orderNumber: razorpayOrder.receipt as string,
        userId: session.user.id,
        addressId,
        subtotal,
        discount,
        shipping,
        total,
        status: "PENDING",
        paymentStatus: "PENDING",
        razorpayOrderId: razorpayOrder.id,
        discountCodeId: discountId ?? null,
        items: {
          create: orderItems,
        },
      },
    });

    // Update discount usage count if applicable
    if (discountId) {
      await prisma.discountCode.update({
        where: { id: discountId },
        data: { usageCount: { increment: 1 } },
      });
    }

    return NextResponse.json({
      order,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
