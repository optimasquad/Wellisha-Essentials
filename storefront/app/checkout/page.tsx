"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  MapPin,
  CreditCard,
  Truck,
  Shield,
  ChevronRight,
  Plus,
  Check,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    image: string;
  };
  variant: {
    id: string;
    name: string;
    price: number;
    salePrice?: number | null;
  };
}

interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponCode = searchParams?.get?.("coupon") ?? "";

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountId, setDiscountId] = useState<string | null>(null);

  const [addressForm, setAddressForm] = useState({
    name: "",
    phone: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?redirect=/checkout");
      return;
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, router]);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [cartRes, addressRes] = await Promise.all([
        fetch("/api/cart"),
        fetch("/api/addresses"),
      ]);

      if (cartRes.ok) {
        const cartData = await cartRes.json();
        setCartItems(cartData?.items ?? []);
        if (!cartData?.items?.length) {
          router.push("/cart");
          return;
        }
      }

      if (addressRes.ok) {
        const addressData = await addressRes.json();
        setAddresses(addressData?.addresses ?? []);
        const defaultAddr = addressData?.addresses?.find?.((a: Address) => a?.isDefault);
        if (defaultAddr) {
          setSelectedAddress(defaultAddr.id);
        } else if (addressData?.addresses?.length > 0) {
          setSelectedAddress(addressData.addresses[0].id);
        }
      }

      // Validate coupon if provided
      if (couponCode) {
        const subtotal = cartItems?.reduce?.((total, item) => {
          const price = item?.variant?.salePrice ?? item?.variant?.price ?? 0;
          return total + price * (item?.quantity ?? 0);
        }, 0) ?? 0;

        const discountRes = await fetch("/api/discount/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: couponCode, subtotal }),
        });
        const discountData = await discountRes.json();
        if (discountData?.valid) {
          setDiscount(discountData?.discount ?? 0);
          setDiscountId(discountData?.discountId ?? null);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load checkout data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });

      if (res.ok) {
        const data = await res.json();
        setAddresses([...addresses, data?.address]);
        setSelectedAddress(data?.address?.id);
        setShowAddressForm(false);
        setAddressForm({
          name: "",
          phone: "",
          addressLine: "",
          city: "",
          state: "",
          pincode: "",
        });
        toast.success("Address added successfully");
      }
    } catch (error) {
      console.error("Error adding address:", error);
      toast.error("Failed to add address");
    }
  };

  const subtotal =
    cartItems?.reduce?.((total, item) => {
      const price = item?.variant?.salePrice ?? item?.variant?.price ?? 0;
      return total + price * (item?.quantity ?? 0);
    }, 0) ?? 0;

  const shipping = subtotal > 499 ? 0 : 49;
  const total = subtotal - discount + shipping;

  const handlePayment = async () => {
    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }

    setIsProcessing(true);
    try {
      // Create order
      const orderRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: selectedAddress,
          discountId,
          discount,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        toast.error(orderData?.error ?? "Failed to create order");
        return;
      }

      // Initialize Razorpay
      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        amount: orderData?.razorpayOrder?.amount ?? 0,
        currency: "INR",
        name: "Wellisha Essentials",
        description: "Order Payment",
        order_id: orderData?.razorpayOrder?.id ?? "",
        handler: async (response: RazorpayResponse) => {
          // Verify payment
          const verifyRes = await fetch("/api/orders/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: orderData?.order?.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          if (verifyRes.ok) {
            toast.success("Payment successful!");
            router.push(`/order-success?orderId=${orderData?.order?.id}`);
          } else {
            toast.error("Payment verification failed");
          }
        },
        prefill: {
          name: session?.user?.name ?? "",
          email: session?.user?.email ?? "",
          contact: addresses?.find?.((a) => a?.id === selectedAddress)?.phone ?? "",
        },
        theme: {
          color: "#FF6B6B",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#FF6B6B] text-white rounded-full flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <h2 className="text-xl font-semibold">Delivery Address</h2>
              </div>

              {addresses?.length > 0 && !showAddressForm ? (
                <div className="space-y-3">
                  {addresses?.map?.((address) => (
                    <label
                      key={address?.id}
                      className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedAddress === address?.id
                          ? "border-[#FF6B6B] bg-[#FFF5F5]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="address"
                          value={address?.id}
                          checked={selectedAddress === address?.id}
                          onChange={() => setSelectedAddress(address?.id ?? "")}
                          className="mt-1 accent-[#FF6B6B]"
                        />
                        <div className="flex-1">
                          <p className="font-semibold">{address?.name ?? "Name"}</p>
                          <p className="text-gray-600 text-sm">
                            {address?.addressLine ?? ""}
                          </p>
                          <p className="text-gray-600 text-sm">
                            {address?.city ?? ""}, {address?.state ?? ""} - {address?.pincode ?? ""}
                          </p>
                          <p className="text-gray-600 text-sm">Phone: {address?.phone ?? ""}</p>
                        </div>
                        {selectedAddress === address?.id && (
                          <Check size={20} className="text-[#FF6B6B]" />
                        )}
                      </div>
                    </label>
                  )) ?? null}
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="flex items-center gap-2 text-[#FF6B6B] font-medium hover:underline"
                  >
                    <Plus size={18} />
                    Add New Address
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddAddress} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={addressForm.name}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, name: e?.target?.value ?? "" })
                      }
                      className="px-4 py-3 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={addressForm.phone}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, phone: e?.target?.value ?? "" })
                      }
                      className="px-4 py-3 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Address Line"
                    value={addressForm.addressLine}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, addressLine: e?.target?.value ?? "" })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                    required
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="City"
                      value={addressForm.city}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, city: e?.target?.value ?? "" })
                      }
                      className="px-4 py-3 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                      required
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={addressForm.state}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, state: e?.target?.value ?? "" })
                      }
                      className="px-4 py-3 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={addressForm.pincode}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, pincode: e?.target?.value ?? "" })
                      }
                      className="px-4 py-3 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#FF6B6B] text-white font-semibold rounded-lg hover:bg-[#E55A5A] transition-colors"
                    >
                      Save Address
                    </button>
                    {addresses?.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </motion.div>

            {/* Order Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold mb-4">Order Items</h2>
              <div className="space-y-4">
                {cartItems?.map?.((item) => {
                  const price = item?.variant?.salePrice ?? item?.variant?.price ?? 0;
                  return (
                    <div key={item?.id} className="flex gap-4">
                      <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={item?.product?.image ?? "/products/wellisha-hero.jpg"}
                          alt={item?.product?.name ?? "Product"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item?.product?.name ?? "Product"}</h3>
                        <p className="text-sm text-gray-500">{item?.variant?.name ?? "Variant"}</p>
                        <p className="text-sm text-gray-500">Qty: {item?.quantity ?? 0}</p>
                      </div>
                      <p className="font-semibold">₹{price * (item?.quantity ?? 0)}</p>
                    </div>
                  );
                }) ?? null}
              </div>
            </motion.div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="text-xl font-semibold mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{shipping === 0 ? "FREE" : `₹${shipping}`}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-[#FF6B6B]">₹{total}</span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield size={16} className="text-green-600" />
                  Secure Payment by Razorpay
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Truck size={16} className="text-[#FF6B6B]" />
                  {shipping === 0 ? "Free Delivery" : "Delivery charges ₹49"}
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={isProcessing || !selectedAddress}
                className="w-full py-4 bg-[#FF6B6B] text-white font-semibold rounded-full hover:bg-[#E55A5A] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                {isProcessing ? "Processing..." : `Pay ₹${total}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
