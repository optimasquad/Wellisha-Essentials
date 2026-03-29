export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  image: string;
  images: string[];
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: Category;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  salePrice?: number | null;
  stock: number;
  size?: string | null;
  contents?: string | null;
  isDefault: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  isActive: boolean;
  sortOrder: number;
  products?: Product[];
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string;
  quantity: number;
  product?: Product;
  variant?: ProductVariant;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
}

export interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  createdAt: Date;
  items?: OrderItem[];
  address?: Address | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
  total: number;
  product?: Product;
  variant?: ProductVariant;
}

export interface DiscountCode {
  id: string;
  code: string;
  description?: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  isActive: boolean;
  startsAt: Date;
  expiresAt?: Date | null;
}
