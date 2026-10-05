import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { sameOrigin } from "@/lib/request-security";

export async function publicCommerceRequest(path: string) {
  try {
    const base = process.env.COMMERCE_API_URL;
    if (!base) throw new Error("Service not configured");
    const target = new URL(base);
    if (target.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && target.hostname === "127.0.0.1")) throw new Error("Invalid service URL");
    const result = await fetch(new URL(path,target), { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
    const body = await result.text();
    return new NextResponse(body || null, { status: result.status, headers: {
      ...(body ? { "Content-Type": "application/json" } : {}), "Cache-Control": "no-store",
      "X-Correlation-ID": result.headers.get("X-Correlation-ID") ?? "",
    } });
  } catch {
    return NextResponse.json({ code: "SERVICE_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function commerceRequest(request: NextRequest, path: string, init: RequestInit = {}) {
  const base = process.env.COMMERCE_API_URL;
  if (!base) return NextResponse.json({ error: "Commerce service is not configured", code: "SERVICE_NOT_READY" }, { status: 503 });
  if ((init.method ?? "GET") !== "GET" && !sameOrigin(request.headers.get("origin"), request.url)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = token?.cognitoAccessToken;
  const expiresAt = token?.cognitoExpiresAt;
  if (typeof accessToken !== "string" || typeof expiresAt !== "number" || expiresAt <= Date.now()/1000) {
    return NextResponse.json({ error: "Sign in with the new identity provider", code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  }
  const target = new URL(base);
  if (target.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && target.hostname === "127.0.0.1")) {
    return NextResponse.json({ error: "Service configuration is invalid" }, { status: 503 });
  }
  try {
    const result = await fetch(new URL(path, target), {
      ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${accessToken}` },
    });
    if (result.status === 204) return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    const data = await result.json();
    return NextResponse.json(data, { status: result.status, headers: {
      "Cache-Control": "no-store", "X-Correlation-ID": result.headers.get("X-Correlation-ID") ?? "",
    } });
  } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
