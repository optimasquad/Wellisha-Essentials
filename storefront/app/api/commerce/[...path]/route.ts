import { NextRequest, NextResponse } from "next/server";
import { commerceRequest } from "@/lib/commerce-api";
import { readCommerceBody, RequestBodyError } from "@/lib/request-body";
import { sameOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";
const allowed = /^(me(?:\/addresses(?:\/[A-Za-z0-9_-]{1,100})?|\/notifications(?:\/[A-Za-z0-9_-]{1,100}\/read)?)?|orders(?:\/[A-Za-z0-9_-]{1,100}(?:\/tracking)?)?|cart(?:\/items(?:\/[A-Za-z0-9_-]{1,100})?)?)$/;
async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  if (!allowed.test(path)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.method !== "GET" && !sameOrigin(request.headers.get("origin"), request.url)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  let body: string | undefined;
  try {
    if (["POST", "PATCH"].includes(request.method)) body = await readCommerceBody(request);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    const code = error instanceof RequestBodyError ? error.code : "INVALID_REQUEST_BODY";
    return NextResponse.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
  }
  return commerceRequest(request, "/v1/" + path, {
    method: request.method, body,
    headers: request.headers.has("Idempotency-Key") ? { "Idempotency-Key": request.headers.get("Idempotency-Key")! } : {},
  });
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
