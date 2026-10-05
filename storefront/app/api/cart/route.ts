import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sameOrigin, validIdentifier, validQuantity } from "@/lib/request-security";

export const dynamic = "force-dynamic";
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return fail(401, "Unauthorized");
  try {
    const cart = await prisma.cart.findUnique({ where: { userId: session.user.id }, include: { items: {
      include: { product: { select: { id:true,name:true,slug:true,image:true } },
        variant: { select: { id:true,name:true,price:true,salePrice:true,stock:true } } },
    } } });
    return NextResponse.json({ items: cart?.items ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return fail(503, "Cart temporarily unavailable"); }
}
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return fail(401, "Unauthorized");
  if (!sameOrigin(request.headers.get("origin"), request.url)) return fail(403, "Invalid request origin");
  try {
    const { productId, variantId, quantity = 1 } = await request.json();
    if (!validIdentifier(productId) || !validIdentifier(variantId) || !validQuantity(quantity)) return fail(400, "Invalid cart item");
    const outcome = await prisma.$transaction(async tx => {
      const variant = await tx.productVariant.findFirst({ where: { id: variantId, productId, product: { isActive: true } } });
      if (!variant || variant.stock < quantity) return false;
      const cart = await tx.cart.upsert({ where: { userId: session.user.id }, create: { userId: session.user.id }, update: {} });
      const key = { cartId_productId_variantId: { cartId: cart.id, productId, variantId } };
      const existing = await tx.cartItem.findUnique({ where: key });
      const next = (existing?.quantity ?? 0) + quantity;
      if (next > Math.min(100, variant.stock)) return false;
      await tx.cartItem.upsert({ where: key, create: { cartId:cart.id,productId,variantId,quantity },
        update: { quantity: next } });
      return true;
    }, { isolationLevel: "Serializable" });
    return outcome ? NextResponse.json({ success:true }) : fail(409, "Item unavailable");
  } catch { return fail(409, "Cart update failed; refresh and retry"); }
}
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return fail(401, "Unauthorized");
  if (!sameOrigin(request.headers.get("origin"), request.url)) return fail(403, "Invalid request origin");
  try {
    const { itemId, quantity } = await request.json();
    if (!validIdentifier(itemId) || !validQuantity(quantity)) return fail(400, "Invalid cart item");
    const result = await prisma.cartItem.updateMany({ where: { id: itemId, cart: { userId: session.user.id },
      variant: { stock: { gte: quantity }, product: { isActive: true } } }, data: { quantity } });
    return result.count === 1 ? NextResponse.json({ success:true }) : fail(404, "Cart item not found");
  } catch { return fail(503, "Cart temporarily unavailable"); }
}
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return fail(401, "Unauthorized");
  if (!sameOrigin(request.headers.get("origin"), request.url)) return fail(403, "Invalid request origin");
  const itemId = new URL(request.url).searchParams.get("itemId");
  if (!validIdentifier(itemId)) return fail(400, "Invalid cart item");
  try {
    const result = await prisma.cartItem.deleteMany({ where: { id: itemId, cart: { userId: session.user.id } } });
    return result.count === 1 ? NextResponse.json({ success:true }) : fail(404, "Cart item not found");
  } catch { return fail(503, "Cart temporarily unavailable"); }
}
