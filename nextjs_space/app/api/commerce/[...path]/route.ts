import { NextRequest, NextResponse } from "next/server";
import { commerceRequest } from "@/lib/commerce-api";

export const dynamic = "force-dynamic";
const allowed = /^(me(?:\/addresses(?:\/[A-Za-z0-9_-]{1,100})?|\/notifications(?:\/[A-Za-z0-9_-]{1,100}\/read)?)?|orders(?:\/[A-Za-z0-9_-]{1,100}(?:\/tracking)?)?)$/;
async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  if (!allowed.test(path)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = ["POST", "PATCH"].includes(request.method) ? await request.text() : undefined;
  if (body && Buffer.byteLength(body, "utf8") > 16384) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  return commerceRequest(request, "/v1/" + path, {
    method: request.method, body,
    headers: request.headers.has("Idempotency-Key") ? { "Idempotency-Key": request.headers.get("Idempotency-Key")! } : {},
  });
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };

