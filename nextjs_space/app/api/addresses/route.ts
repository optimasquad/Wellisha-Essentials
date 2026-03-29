import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ addresses: [] });
    }

    const addresses = await prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ addresses: addresses ?? [] });
  } catch (error) {
    console.error("Get addresses error:", error);
    return NextResponse.json({ addresses: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, addressLine, city, state, pincode } = body ?? {};

    if (!name || !phone || !addressLine || !city || !state || !pincode) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check if this is the first address
    const existingAddresses = await prisma.address.count({
      where: { userId: session.user.id },
    });

    const address = await prisma.address.create({
      data: {
        userId: session.user.id,
        name,
        phone,
        addressLine,
        city,
        state,
        pincode,
        isDefault: existingAddresses === 0,
      },
    });

    return NextResponse.json({ address });
  } catch (error) {
    console.error("Create address error:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}
