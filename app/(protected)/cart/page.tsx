"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import axiosInstance from "@/services/axios";
import toast from "react-hot-toast";
import CheckoutModal from "@/components/CheckoutModal";
import { confirmToast } from "@/utils/confirmToast";

interface CartItem {
  productId: string;
  variationId?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  variationDetails?: {
    size?: string;
    color?: string;
  };
}

interface Cart {
  _id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
}

export default function CartPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchCart();
    }
  }, [status, router]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/cart");
      setCart(response.data.data);
    } catch (error: any) {
      console.error("Error fetching cart:", error);
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (
    productId: string,
    variationId: string | undefined,
    newQuantity: number
  ) => {
    if (newQuantity < 1) return;

    try {
      setUpdating(`${productId}-${variationId || "none"}`);
      const response = await axiosInstance.put(
        "/cart/update",
        {
          productId,
          variationId,
          quantity: newQuantity,
        }
      );
      setCart(response.data.data);
      toast.success("Cart updated");
    } catch (error: any) {
      console.error("Error updating cart:", error);
      toast.error(error.response?.data?.message || "Failed to update cart");
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (
    productId: string,
    variationId: string | undefined
  ) => {
    try {
      setUpdating(`${productId}-${variationId || "none"}`);
      const response = await axiosInstance.delete("/cart/remove", {
        data: {
          productId,
          variationId,
        },
      });
      setCart(response.data.data);
      toast.success("Item removed from cart");
    } catch (error: any) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    } finally {
      setUpdating(null);
    }
  };

  const clearCart = async () => {
    confirmToast({
      title: "Clear Cart",
      message: "Are you sure you want to clear your cart?",
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await axiosInstance.delete("/cart/clear");
          setCart(response.data.data);
          toast.success("Cart cleared");
        } catch (error: any) {
          console.error("Error clearing cart:", error);
          toast.error("Failed to clear cart");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-9 w-48 bg-gray-700 rounded animate-pulse mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-gray-700 rounded"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-6 w-3/4 bg-gray-700 rounded"></div>
                      <div className="h-4 w-1/2 bg-gray-700 rounded"></div>
                      <div className="h-4 w-1/3 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 h-fit animate-pulse">
              <div className="h-7 w-32 bg-gray-700 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 w-full bg-gray-700 rounded"></div>
                <div className="h-4 w-3/4 bg-gray-700 rounded"></div>
                <div className="h-12 w-full bg-gray-700 rounded mt-6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Shopping Cart</h1>
          {!isEmpty && (
            <button
              onClick={clearCart}
              className="text-red-400 hover:text-red-300 transition text-sm"
            >
              Clear Cart
            </button>
          )}
        </div>

        {isEmpty ? (
          <div className="bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <svg
              className="mx-auto h-24 w-24 text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-white mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-400 mb-6">
              Start shopping to add items to your cart!
            </p>
            <button
              onClick={() => router.push("/products")}
              className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => {
                const itemKey = `${item.productId}-${item.variationId || "none"}`;
                const isUpdating = updating === itemKey;

                return (
                  <div
                    key={itemKey}
                    className="bg-gray-800 rounded-lg p-4 flex gap-4"
                  >
                    {/* Product Image */}
                    <div className="w-24 h-24 bg-gray-700 rounded-lg overflow-hidden shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-purple-400 to-blue-500">
                          <svg
                            className="w-12 h-12 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {item.name}
                      </h3>
                      {item.variationDetails && (
                        <p className="text-sm text-gray-400">
                          {[
                            item.variationDetails.size,
                            item.variationDetails.color,
                          ]
                            .filter(Boolean)
                            .join(" - ")}
                        </p>
                      )}
                      <p className="text-purple-400 font-bold mt-2">
                        ${item.price.toFixed(2)}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.variationId,
                              item.quantity - 1
                            )
                          }
                          disabled={isUpdating || item.quantity <= 1}
                          className="w-8 h-8 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        <span className="text-white w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.variationId,
                              item.quantity + 1
                            )
                          }
                          disabled={isUpdating}
                          className="w-8 h-8 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Item Total & Remove */}
                    <div className="text-right flex flex-col justify-between">
                      <p className="text-xl font-bold text-white">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() =>
                          removeItem(item.productId, item.variationId)
                        }
                        disabled={isUpdating}
                        className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-lg p-6 sticky top-4">
                <h2 className="text-xl font-bold text-white mb-4">
                  Order Summary
                </h2>
                
                {/* Items List */}
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {cart.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex-1 text-gray-300">
                        <p className="font-semibold text-white">{item.name}</p>
                        {item.variationDetails && (
                          <p className="text-xs text-gray-400">
                            {[item.variationDetails.size, item.variationDetails.color]
                              .filter(Boolean)
                              .join(" - ")}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          ${item.price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <div className="text-white font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-700 pt-3 space-y-2 mb-4">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal ({cart.items.length} {cart.items.length === 1 ? 'item' : 'items'})</span>
                    <span>${cart.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="border-t border-gray-700 pt-2 flex justify-between text-white text-xl font-bold">
                    <span>Total</span>
                    <span>${cart.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setIsCheckoutModalOpen(true)}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  Proceed to Checkout
                </button>
                <button
                  onClick={() => router.push("/products")}
                  className="w-full mt-3 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {cart && (
        <CheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          cartItems={cart.items.map((item) => ({
            _id: item.variationId || item.productId,
            productId: {
              _id: item.productId,
              name: item.name,
              price: item.price,
              imageUrl: item.imageUrl,
            },
            quantity: item.quantity,
            variationId: item.variationId,
          }))}
          onOrderSuccess={() => {
            setIsCheckoutModalOpen(false);
            toast.success("Order placed successfully!");
            fetchCart();
          }}
        />
      )}
    </div>
  );
}

