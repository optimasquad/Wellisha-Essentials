import LegacyCheckout from "@/components/legacy-checkout";
import { CommerceCheckout } from "@/components/commerce/checkout";
export default function CheckoutPage() {
  return process.env.COMMERCE_API_URL ? <CommerceCheckout enabled={process.env.CHECKOUT_ENABLED === "true"} /> : <LegacyCheckout />;
}
