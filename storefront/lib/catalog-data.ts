import type { CatalogPage, CartView, CategoryView, ProductDetailView, ProductView } from "@/lib/generated/commerce-types";

const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const money = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const timestamp = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
function timed(value: Record<string, unknown>) { return timestamp(value.pricedAt) && money(value.refreshAfterMs) && value.refreshAfterMs >= 1000 && value.refreshAfterMs <= 15000; }
export function isProduct(value: unknown): value is ProductView {
  return object(value) && ["id", "name", "sku", "slug", "description", "image", "currency"].every(key => typeof value[key] === "string")
    && value.currency === "INR" && typeof value.available === "boolean"
    && (value.categoryId === null || typeof value.categoryId === "string") && (value.offerTitle === null || typeof value.offerTitle === "string")
    && (value.offerSummary === null || typeof value.offerSummary === "string")
    && money(value.priceMinor) && money(value.basePriceMinor) && money(value.discountMinor) && money(value.priceVersion)
    && value.priceMinor + value.discountMinor === value.basePriceMinor;
}
export function isCatalogPage(value: unknown): value is CatalogPage {
  return object(value) && timed(value) && money(value.page) && typeof value.hasMore === "boolean"
    && Array.isArray(value.items) && value.items.length <= 100 && value.items.every(isProduct);
}
export function isProductDetail(value: unknown): value is ProductDetailView { return object(value) && timed(value) && isProduct(value.product) && Array.isArray(value.variants) && value.variants.length<=100 && value.variants.every(v=>object(v)&&['id','slug','label'].every(k=>typeof v[k]==='string')&&money(v.priceMinor)&&typeof v.available==='boolean') && Array.isArray(value.bundleContents) && value.bundleContents.length<=10 && value.bundleContents.every(c=>object(c)&&typeof c.productId==='string'&&typeof c.name==='string'&&money(c.quantity)&&c.quantity>=1&&c.quantity<=100); }
export function isCategories(value: unknown): value is CategoryView[] {
  return Array.isArray(value) && value.every(v => object(v) && ["id", "name", "slug"].every(k => typeof v[k] === "string"));
}
export function isCart(value: unknown): value is CartView {
  if (!object(value) || !timed(value) || value.currency !== "INR" || !money(value.subtotalMinor) || !money(value.savingsMinor)
    || !Array.isArray(value.items) || value.items.length > 50) return false;
  let subtotal = 0, savings = 0;
  for (const item of value.items) {
    if (!object(item) || typeof item.id !== "string" || !money(item.quantity) || item.quantity < 1 || item.quantity > 100 || !isProduct(item.product)
      || !money(item.lineTotalMinor) || !money(item.lineDiscountMinor) || typeof item.purchasable !== "boolean") return false;
    const gross = item.product.basePriceMinor * item.quantity;
    if (!Number.isSafeInteger(gross) || item.lineTotalMinor + item.lineDiscountMinor !== gross) return false;
    subtotal += item.lineTotalMinor; savings += item.lineDiscountMinor;
  }
  return Number.isSafeInteger(subtotal) && Number.isSafeInteger(savings) && subtotal === value.subtotalMinor && savings === value.savingsMinor;
}
export function formatMinor(value: number, currency = "INR") {
  if (!money(value)) return "Price unavailable";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value / 100);
}
export function refreshDelay(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(1000,Math.min(15000,Math.trunc(value))) : 15000;
}
