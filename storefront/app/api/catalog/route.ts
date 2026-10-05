import { NextRequest } from "next/server";
import { publicCommerceRequest } from "@/lib/commerce-api";

export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  const query = new URLSearchParams();
  for (const key of ["page", "size", "category", "search", "sort"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value !== null) query.set(key,value);
  }
  return publicCommerceRequest("/v1/products?" + query.toString());
}
