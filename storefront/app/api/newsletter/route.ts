import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email } = body ?? {};

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const existing = await prisma.newsletterSubscription.findUnique({
      where: { phone },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You're already subscribed!" },
        { status: 400 }
      );
    }

    await prisma.newsletterSubscription.create({
      data: {
        phone,
        email: email ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
