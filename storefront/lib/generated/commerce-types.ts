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
