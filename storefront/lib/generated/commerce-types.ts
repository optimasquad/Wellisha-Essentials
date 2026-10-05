// Generated from backend/contracts/openapi.json. Run npm run contracts:generate.
// Types describe wire data; validate untrusted JSON at runtime. int64 maps to number: require safe integers.

export type Customer = {
  "id": string;
};

export type AddressInput = {
  "name": string;
  "phone": string;
  "addressLine": string;
  "city": string;
  "state": string;
  "pincode": string;
};

export type Address = {
  "id": string;
  "name": string;
  "phone": string;
  "addressLine": string;
  "city": string;
  "state": string;
  "pincode": string;
  "version": number;
};

export type VersionedAddressInput = {
  "version": number;
  "address": AddressInput;
};

export type ProductView = {
  "id": string;
  "name": string;
  "sku": string;
  "priceMinor": number;
  "available": boolean;
  "slug": string;
  "description": string;
  "image": string;
  "categoryId": string | null;
  "basePriceMinor": number;
  "discountMinor": number;
  "offerTitle": string | null;
  "priceVersion": number;
  "currency": string;
  "offerSummary": string | null;
};

export type OrderLineInput = {
  "productId": string;
  "quantity": number;
};

export type CreateOrderInput = {
  "addressId": string;
  "items": Array<OrderLineInput>;
};

export type OrderView = {
  "id": string;
  "totalMinor": number;
  "currency": string;
  "paymentState": string;
  "fulfillmentState": string;
  "createdAt": string;
};

export type TrackingView = {
  "state": string;
  "occurredAt": string;
};

export type ShipmentView = {
  "id": string;
  "state": string;
  "carrier": string;
  "trackingId": string | null;
  "estimatedDelivery": string | null;
  "updatedAt": string;
  "events": Array<TrackingView>;
};

export type NotificationView = {
  "id": string;
  "orderId": string;
  "message": string;
  "createdAt": string;
  "read": boolean;
};

export type ApiError = {
  "code": string;
  "correlationId": string;
};

export type CategoryView = {
  "id": string;
  "name": string;
  "slug": string;
};

export type CatalogPage = {
  "items": Array<ProductView>;
  "page": number;
  "hasMore": boolean;
  "pricedAt": string;
  "refreshAfterMs": number;
};

export type ProductDetailView = {
  "product": ProductView;
  "pricedAt": string;
  "refreshAfterMs": number;
  "variants": Array<ProductVariantView>;
  "bundleContents": Array<BundleComponentView>;
};

export type OfferInput = {
  "title": string;
  "kind": "PERCENTAGE" | "FIXED_AMOUNT" | "BUNDLE_PRICE" | "BUY_X_GET_Y";
  "value": number;
  "startsAt": string;
  "endsAt": string;
  "buyQuantity"?: number;
  "freeQuantity"?: number;
};

export type PricingInput = {
  "version": number;
  "basePriceMinor": number;
  "offers": Array<OfferInput>;
  "reason": string;
};

export type CartItemInput = {
  "productId": string;
  "quantity": number;
};

export type CartQuantityInput = {
  "quantity": number;
};

export type CartItemView = {
  "id": string;
  "quantity": number;
  "product": ProductView;
  "lineTotalMinor": number;
  "lineDiscountMinor": number;
  "purchasable": boolean;
};

export type CartView = {
  "items": Array<CartItemView>;
  "subtotalMinor": number;
  "savingsMinor": number;
  "currency": string;
  "pricedAt": string;
  "refreshAfterMs": number;
};

export type PricingConfiguration = {
  "version": number;
  "basePriceMinor": number;
  "offers": Array<OfferInput>;
};

export type QuoteLine = {
  "productId": string;
  "quantity": number;
  "basePriceMinor": number;
  "discountMinor": number;
  "totalMinor": number;
  "priceVersion": number;
};

export type CheckoutQuote = {
  "id": string;
  "addressId": string;
  "items": Array<QuoteLine>;
  "subtotalMinor": number;
  "shippingMinor": number;
  "totalMinor": number;
  "currency": "INR";
  "expiresAt": string;
};

export type AcceptQuoteInput = {
  "quoteId": string;
};

export type PaymentCheckout = {
  "orderId": string;
  "providerOrderId": string;
  "keyId": string;
  "amountMinor": number;
  "currency": "INR";
};

export type RefundInput = {
  "amountMinor": number;
  "reason": string;
};

export type RefundView = {
  "id": string;
  "orderId": string;
  "amountMinor": number;
  "state": string;
};

export type ParcelInput = {
  "weightGrams": number;
  "lengthMm": number;
  "widthMm": number;
  "heightMm": number;
  "items": Array<OrderLineInput>;
};

export type ParcelView = {
  "id": string;
  "orderId": string;
  "state": string;
  "version": number;
};

export type ReadyParcelInput = {
  "version": number;
};

export type ShipmentDocumentLink = {
  "url": string;
  "expiresInSeconds": number;
};

export type NotificationPreferences = {
  "emailEnabled": boolean;
  "smsEnabled": boolean;
  "version": number;
};

export type NotificationPreferenceInput = {
  "emailEnabled": boolean;
  "smsEnabled": boolean;
  "version": number;
};

export type ProductVariantView = {
  "id": string;
  "slug": string;
  "label": string;
  "priceMinor": number;
  "available": boolean;
};

export type StaffOrderLine = {
  "productId": string;
  "name": string;
  "quantity": number;
  "totalMinor": number;
  "allocatedQuantity": number;
};

export type StaffOrderOperations = {
  "order": OrderView;
  "items": Array<StaffOrderLine>;
  "parcels": Array<ParcelView>;
  "refunds": Array<RefundView>;
};

export type ShipmentCancellationInput = {
  "version": number;
  "reason": string;
};

export type BundleComponentView = {
  "productId": string;
  "name": string;
  "quantity": number;
};

export type BundleConfiguration = {
  "version": number;
  "items": Array<OrderLineInput>;
};

export type BundleInput = {
  "version": number;
  "items": Array<OrderLineInput>;
  "reason": string;
};
