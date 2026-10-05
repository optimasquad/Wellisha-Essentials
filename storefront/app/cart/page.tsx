import LegacyCart from "@/components/legacy-cart";
import { CommerceCart } from "@/components/commerce/cart";

export default function CartPage() {
  return process.env.COMMERCE_API_URL ? <CommerceCart /> : <LegacyCart />;
}
