import { publicCommerceRequest } from "@/lib/commerce-api";

export const dynamic = "force-dynamic";
export function GET(_: Request, { params }: { params: { slug: string } }) {
  return publicCommerceRequest("/v1/products/" + encodeURIComponent(params.slug));
}
