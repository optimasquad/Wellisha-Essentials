// Generated from backend/contracts/openapi.json. Run npm run contracts:generate.
import type { AcceptQuoteInput, Address, AddressInput, BundleConfiguration, BundleInput, CartItemInput, CartQuantityInput, CartView, CatalogPage, CategoryView, CheckoutQuote, CreateOrderInput, Customer, NotificationPreferenceInput, NotificationPreferences, NotificationView, OrderView, ParcelInput, ParcelView, PaymentCheckout, PricingConfiguration, PricingInput, ProductDetailView, ReadyParcelInput, RefundInput, RefundView, ShipmentCancellationInput, ShipmentDocumentLink, ShipmentView, StaffOrderOperations, VersionedAddressInput } from './commerce-types';

export type CommerceClientOptions = { signal?: AbortSignal; query?: Record<string,string|number|undefined>; fetch?: typeof fetch };
export class CommerceApiError extends Error { constructor(public readonly status: number) { super('Commerce request failed'); } }
async function send<T>(path: string, method: string, body: unknown, key: string|undefined, options: CommerceClientOptions, allowedQuery: string[]): Promise<T> {
  const query = new URLSearchParams(); for (const name of allowedQuery) { const value=options.query?.[name]; if(value!==undefined)query.set(name,String(value)); }
  const response=await (options.fetch??fetch)(path+(query.size?'?'+query.toString():''), { method, cache:'no-store', signal:options.signal, headers:{'Content-Type':'application/json', ...(key?{'Idempotency-Key':key}:{})}, ...(body===undefined?{}:{body:JSON.stringify(body)}) });
  if(!response.ok)throw new CommerceApiError(response.status); return (response.status===204?undefined:await response.json()) as T;
}

export function getCustomer(options: CommerceClientOptions = {}): Promise<Customer> {
  return send<Customer>(`/api/commerce/me`, "GET", undefined, undefined, options, []);
}

export function listAddresses(options: CommerceClientOptions = {}): Promise<Array<Address>> {
  return send<Array<Address>>(`/api/commerce/me/addresses`, "GET", undefined, undefined, options, []);
}

export function createAddress(body: AddressInput, options: CommerceClientOptions = {}): Promise<Address> {
  return send<Address>(`/api/commerce/me/addresses`, "POST", body, undefined, options, []);
}

export function updateAddress(id: string, body: VersionedAddressInput, options: CommerceClientOptions = {}): Promise<Address> {
  return send<Address>(`/api/commerce/me/addresses/${encodeURIComponent(id)}`, "PATCH", body, undefined, options, []);
}

export function deleteAddress(id: string, options: CommerceClientOptions = {}): Promise<void> {
  return send<void>(`/api/commerce/me/addresses/${encodeURIComponent(id)}`, "DELETE", undefined, undefined, options, []);
}

export function listProducts(options: CommerceClientOptions = {}): Promise<CatalogPage> {
  return send<CatalogPage>(`/api/catalog`, "GET", undefined, undefined, options, ["page","size","category","search","sort"]);
}

export function acceptQuote(body: AcceptQuoteInput, idempotencyKey: string, options: CommerceClientOptions = {}): Promise<OrderView> {
  return send<OrderView>(`/api/commerce/orders`, "POST", body, idempotencyKey, options, []);
}

export function listOrders(options: CommerceClientOptions = {}): Promise<Array<OrderView>> {
  return send<Array<OrderView>>(`/api/commerce/orders`, "GET", undefined, undefined, options, []);
}

export function getOrder(id: string, options: CommerceClientOptions = {}): Promise<OrderView> {
  return send<OrderView>(`/api/commerce/orders/${encodeURIComponent(id)}`, "GET", undefined, undefined, options, []);
}

export function listShipments(id: string, options: CommerceClientOptions = {}): Promise<Array<ShipmentView>> {
  return send<Array<ShipmentView>>(`/api/commerce/orders/${encodeURIComponent(id)}/tracking`, "GET", undefined, undefined, options, []);
}

export function listNotifications(options: CommerceClientOptions = {}): Promise<Array<NotificationView>> {
  return send<Array<NotificationView>>(`/api/commerce/me/notifications`, "GET", undefined, undefined, options, []);
}

export function readNotification(id: string, options: CommerceClientOptions = {}): Promise<void> {
  return send<void>(`/api/commerce/me/notifications/${encodeURIComponent(id)}/read`, "PATCH", undefined, undefined, options, []);
}

export function getProduct(slug: string, options: CommerceClientOptions = {}): Promise<ProductDetailView> {
  return send<ProductDetailView>(`/api/catalog/${encodeURIComponent(slug)}`, "GET", undefined, undefined, options, []);
}

export function listCategories(options: CommerceClientOptions = {}): Promise<Array<CategoryView>> {
  return send<Array<CategoryView>>(`/api/catalog/categories`, "GET", undefined, undefined, options, []);
}

export function updatePricing(id: string, body: PricingInput, options: CommerceClientOptions = {}): Promise<ProductDetailView> {
  return send<ProductDetailView>(`/api/commerce/admin/products/${encodeURIComponent(id)}/pricing`, "PATCH", body, undefined, options, []);
}

export function getPricingConfiguration(id: string, options: CommerceClientOptions = {}): Promise<PricingConfiguration> {
  return send<PricingConfiguration>(`/api/commerce/admin/products/${encodeURIComponent(id)}/pricing`, "GET", undefined, undefined, options, []);
}

export function getCart(options: CommerceClientOptions = {}): Promise<CartView> {
  return send<CartView>(`/api/commerce/cart`, "GET", undefined, undefined, options, []);
}

export function addCartItem(body: CartItemInput, options: CommerceClientOptions = {}): Promise<void> {
  return send<void>(`/api/commerce/cart/items`, "POST", body, undefined, options, []);
}

export function updateCartItem(id: string, body: CartQuantityInput, options: CommerceClientOptions = {}): Promise<void> {
  return send<void>(`/api/commerce/cart/items/${encodeURIComponent(id)}`, "PATCH", body, undefined, options, []);
}

export function deleteCartItem(id: string, options: CommerceClientOptions = {}): Promise<void> {
  return send<void>(`/api/commerce/cart/items/${encodeURIComponent(id)}`, "DELETE", undefined, undefined, options, []);
}

export function createCheckoutQuote(body: CreateOrderInput, options: CommerceClientOptions = {}): Promise<CheckoutQuote> {
  return send<CheckoutQuote>(`/api/commerce/checkout/quotes`, "POST", body, undefined, options, []);
}

export function getCheckoutQuote(id: string, options: CommerceClientOptions = {}): Promise<CheckoutQuote> {
  return send<CheckoutQuote>(`/api/commerce/checkout/quotes/${encodeURIComponent(id)}`, "GET", undefined, undefined, options, []);
}

export function getPaymentCheckout(id: string, options: CommerceClientOptions = {}): Promise<PaymentCheckout> {
  return send<PaymentCheckout>(`/api/commerce/orders/${encodeURIComponent(id)}/payment`, "GET", undefined, undefined, options, []);
}

export function requestRefund(id: string, body: RefundInput, idempotencyKey: string, options: CommerceClientOptions = {}): Promise<RefundView> {
  return send<RefundView>(`/api/commerce/staff/orders/${encodeURIComponent(id)}/refunds`, "POST", body, idempotencyKey, options, []);
}

export function createParcel(id: string, body: ParcelInput, idempotencyKey: string, options: CommerceClientOptions = {}): Promise<ParcelView> {
  return send<ParcelView>(`/api/commerce/staff/orders/${encodeURIComponent(id)}/packages`, "POST", body, idempotencyKey, options, []);
}

export function markParcelReady(id: string, body: ReadyParcelInput, options: CommerceClientOptions = {}): Promise<ParcelView> {
  return send<ParcelView>(`/api/commerce/staff/packages/${encodeURIComponent(id)}/ready`, "POST", body, undefined, options, []);
}

export function getShipmentDocument(id: string, options: CommerceClientOptions = {}): Promise<ShipmentDocumentLink> {
  return send<ShipmentDocumentLink>(`/api/commerce/staff/shipments/${encodeURIComponent(id)}/documents`, "GET", undefined, undefined, options, []);
}

export function getNotificationPreferences(options: CommerceClientOptions = {}): Promise<NotificationPreferences> {
  return send<NotificationPreferences>(`/api/commerce/me/notification-preferences`, "GET", undefined, undefined, options, []);
}

export function updateNotificationPreferences(body: NotificationPreferenceInput, options: CommerceClientOptions = {}): Promise<NotificationPreferences> {
  return send<NotificationPreferences>(`/api/commerce/me/notification-preferences`, "PATCH", body, undefined, options, []);
}

export function getStaffOrderOperations(id: string, options: CommerceClientOptions = {}): Promise<StaffOrderOperations> {
  return send<StaffOrderOperations>(`/api/commerce/staff/orders/${encodeURIComponent(id)}/operations`, "GET", undefined, undefined, options, []);
}

export function listStaffOrders(options: CommerceClientOptions = {}): Promise<Array<OrderView>> {
  return send<Array<OrderView>>(`/api/commerce/staff/orders`, "GET", undefined, undefined, options, []);
}

export function cancelShipment(id: string, body: ShipmentCancellationInput, options: CommerceClientOptions = {}): Promise<ParcelView> {
  return send<ParcelView>(`/api/commerce/staff/shipments/${encodeURIComponent(id)}/cancel`, "POST", body, undefined, options, []);
}

export function getBundleConfiguration(id: string, options: CommerceClientOptions = {}): Promise<BundleConfiguration> {
  return send<BundleConfiguration>(`/api/commerce/admin/products/${encodeURIComponent(id)}/bundle`, "GET", undefined, undefined, options, []);
}

export function updateBundleConfiguration(id: string, body: BundleInput, options: CommerceClientOptions = {}): Promise<BundleConfiguration> {
  return send<BundleConfiguration>(`/api/commerce/admin/products/${encodeURIComponent(id)}/bundle`, "PATCH", body, undefined, options, []);
}
