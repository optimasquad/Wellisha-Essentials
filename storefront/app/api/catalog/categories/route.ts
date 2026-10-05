import { publicCommerceRequest } from "@/lib/commerce-api";

export const dynamic = "force-dynamic";
export function GET() { return publicCommerceRequest("/v1/categories"); }
