import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Retired unsafe legacy payment path. The Kotlin path must pass provider and
  // migration gates before checkout is enabled; no browser callback marks paid.
  return NextResponse.json({
    error: "Checkout is temporarily unavailable while the secure payment service is prepared.",
    code: "SECURE_CHECKOUT_NOT_READY",
  }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
