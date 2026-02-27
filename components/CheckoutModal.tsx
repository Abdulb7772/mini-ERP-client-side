"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Wallet Payment Option Component
function WalletPaymentOption({ onSelect, subtotal }: { onSelect: () => void; subtotal: number }) {
  const { data: session } = useSession();
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!session?.user?.accessToken) return;
      
      try {
        const response = await axios.get(`${API_URL}/wallet`, {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
        });
        const balance = response.data?.data?.balance ?? 0;
        setWalletBalance(balance);
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
        setWalletBalance(0); // Set to 0 on error
      } finally {
        setLoading(false);
      }
    };

    fetchWalletBalance();
  }, [session]);

  const canPayFull = walletBalance >= subtotal;

  return (
    <button
      onClick={onSelect}
      disabled={loading || walletBalance <= 0}
      className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z M12 21v-8" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-lg text-gray-900">Pay with Wallet Points</h3>
            <p className="text-sm text-gray-500">
              {loading ? "Loading..." : `Balance: ${walletBalance.toFixed(2)} points`}
            </p>
            {!loading && (
              canPayFull ? (
                <p className="text-xs text-green-600 mt-1">✓ Sufficient balance</p>
              ) : walletBalance > 0 ? (
                <p className="text-xs text-yellow-600 mt-1">Partial payment available</p>
              ) : (
                <p className="text-xs text-red-600 mt-1">Insufficient balance</p>
              )
            )}
          </div>
        </div>
        <svg className="w-6 h-6 text-gray-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

// Initialize Stripe - validate the key exists
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!stripePublishableKey) {
  console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set in environment variables");
}
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface CartItem {
  productId: {
    _id: string;
    name: string;
    price: number;
    imageUrl?: string;
  };
  quantity: number;
  _id: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onOrderSuccess: () => void;
}

function CheckoutForm({
  cartItems,
  paymentMethod,
  onSuccess,
  onCancel,
}: {
  cartItems: CartItem[];
  paymentMethod: "cod" | "card" | "wallet";
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
}) {
  const { data: session } = useSession();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    // Fetch customer details and wallet balance
    const fetchCustomerInfo = async () => {
      if (!session?.user?.accessToken) return;
      
      try {
        const [userResponse, walletResponse] = await Promise.all([
          axios.get(`${API_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
            },
          }),
          axios.get(`${API_URL}/wallet`, {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
            },
          }),
        ]);

        const user = userResponse.data.data.user;
        setCustomerInfo({
          name: user.name || "",
          phone: user.phone || "",
          address: user.address || "",
        });

        if (walletResponse.data.success) {
          const balance = walletResponse.data?.data?.balance ?? 0;
          setWalletBalance(balance);
        }
      } catch (error) {
        console.error("Error fetching customer info:", error);
        setWalletBalance(0); // Set to 0 on error
      }
    };

    fetchCustomerInfo();
  }, [session]);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.productId.price * item.quantity,
    0
  );
  const codFee = paymentMethod === "cod" ? 250 : 0;
  
  // Calculate wallet discount (can't exceed subtotal + codFee)
  const walletDiscount = useWallet ? Math.min(walletBalance, subtotal + codFee) : 0;
  const total = subtotal + codFee - walletDiscount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (paymentMethod === "card") {
        if (!stripe || !elements) {
          toast.error("Stripe is not loaded. Please check your configuration.");
          setLoading(false);
          return;
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          toast.error("Card element not found");
          setLoading(false);
          return;
        }

        // Create payment method
        const { error, paymentMethod: stripePaymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: {
            name: customerInfo.name,
            phone: customerInfo.phone,
            address: {
              line1: customerInfo.address,
            },
          },
        });

        if (error) {
          console.error("Stripe createPaymentMethod error:", error);
          toast.error(error.message || "Payment failed");
          setLoading(false);
          return;
        }

        // Create payment intent on backend
        try {
          const paymentResponse = await axios.post(
            `${API_URL}/orders/create-payment-intent`,
            {
              amount: Math.round(total * 100), // Convert to cents
              items: cartItems.map((item) => ({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.price,
              })),
            },
            {
              headers: {
                Authorization: `Bearer ${session?.user?.accessToken}`,
              },
            }
          );

          const { clientSecret } = paymentResponse.data.data;

          if (!clientSecret) {
            throw new Error("No client secret returned from server");
          }

          // Confirm payment
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            clientSecret,
            {
              payment_method: stripePaymentMethod.id,
            }
          );

          if (confirmError) {
            console.error("Stripe confirmCardPayment error:", confirmError);
            toast.error(confirmError.message || "Payment confirmation failed");
            setLoading(false);
            return;
          }

          if (paymentIntent && paymentIntent.status === "succeeded") {
            // Place order after successful payment
            await placeOrder("card", paymentIntent.id);
          } else {
            toast.error("Payment was not successful");
            setLoading(false);
          }
        } catch (paymentError: any) {
          console.error("Payment intent creation error:", paymentError);
          toast.error(paymentError.response?.data?.message || "Failed to create payment intent");
          setLoading(false);
        }
      } else if (paymentMethod === "wallet") {
        // Wallet payment - verify sufficient balance
        if (walletBalance < total) {
          toast.error(`Insufficient wallet balance. You have ${walletBalance.toFixed(2)} points but need ${total.toFixed(2)} points.`);
          setLoading(false);
          return;
        }
        await placeOrder("wallet", `WALLET-${Date.now()}`);
      } else {
        // Cash on delivery
        await placeOrder("cod");
      }
    } catch (error: any) {
      console.error("Error processing payment:", error);
      toast.error(error.response?.data?.message || "Payment processing failed");
      setLoading(false);
    }
  };

  const placeOrder = async (paymentType: string, transactionId?: string) => {
    try {
      // Debug logging for cart items
      console.log("=== CheckoutModal Cart Items Debug ===");
      cartItems.forEach((item: any, index: number) => {
        console.log(`Item ${index}:`, {
          _id: item._id,
          productId: item.productId,
          variationId: item.variationId,
          quantity: item.quantity,
        });
      });
      console.log("====================================");
      
      const orderData = {
        items: cartItems.map((item: any) => {
          const orderItem: any = {
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.productId.price,
          };
          
          // If item has a variationId (from OrderNowModal or AddToCartModal with variations)
          if (item.variationId) {
            orderItem.variationId = item.variationId;
          }
          
          console.log("Mapped order item:", orderItem);
          
          return orderItem;
        }),
        shippingAddress: customerInfo.address,
        phone: customerInfo.phone,
        paymentMethod: paymentType,
        paymentStatus: paymentType === "card" || paymentType === "wallet" ? "paid" : "unpaid",
        transactionId: transactionId || undefined,
        totalAmount: total,
        walletPointsUsed: paymentType === "wallet" ? total : (useWallet ? walletDiscount : 0),
      };

      console.log("Placing order with data:", orderData);
      console.log("Auth token:", session?.user?.accessToken ? "Present" : "Missing");

      const response = await axios.post(`${API_URL}/orders`, orderData, {
        headers: {
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      });

      console.log("Order placed successfully:", response.data);
      const orderId = response.data.data._id;
      
      if (paymentType === "wallet") {
        toast.success(`Order placed! Paid ${total.toFixed(2)} wallet points`);
      } else if (useWallet && walletDiscount > 0) {
        toast.success(`Order placed! Used ${walletDiscount.toFixed(2)} wallet points`);
      } else {
        toast.success("Order placed successfully!");
      }
      
      onSuccess(orderId);
    } catch (error: any) {
      console.error("Error placing order:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to place order");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              className="w-full px-3 py-2 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
              className="w-full px-3 py-2 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
            <textarea
              value={customerInfo.address}
              onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
              className="w-full px-3 py-2 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              required
            />
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
        <div className="space-y-2">
          {cartItems.map((item) => (
            <div key={item._id} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.productId.name} x {item.quantity}
              </span>
              <span className="font-medium text-black">${(item.productId.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-black">${subtotal.toFixed(2)}</span>
            </div>
            {paymentMethod === "cod" && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>COD Charges</span>
                <span className="font-medium">${codFee.toFixed(2)}</span>
              </div>
            )}
            
            {/* Wallet Section - only show toggle for COD/Card, for wallet payment show full deduction */}
            {paymentMethod === "wallet" ? (
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between text-sm text-purple-600">
                  <span className="font-medium">Paid with Wallet Points</span>
                  <span className="font-medium">-${total.toFixed(2)}</span>
                </div>
              </div>
            ) : walletBalance > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="useWallet"
                      checked={useWallet}
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="useWallet" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Use Wallet Points
                    </label>
                  </div>
                  <span className="text-sm font-medium text-purple-600">
                    {walletBalance.toFixed(2)} available
                  </span>
                </div>
                {useWallet && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Wallet Discount</span>
                    <span className="font-medium">-${walletDiscount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-between text-black font-bold text-lg mt-2 pt-2 border-t">
              <span>Total</span>
              <span className="text-purple-600">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details for Card */}
      {paymentMethod === "card" && stripe && elements && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">Card Details</h3>
          <div className="bg-white p-3 rounded border border-gray-300">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#424770",
                    "::placeholder": {
                      color: "#aab7c4",
                    },
                  },
                  invalid: {
                    color: "#9e2146",
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Wallet Payment Info */}
      {paymentMethod === "wallet" && (
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-purple-600 mt-0.5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-purple-800">
              <p className="font-semibold mb-1">Payment with Wallet Points</p>
              <p className="mb-1">Current Balance: <strong>{walletBalance.toFixed(2)} points</strong></p>
              <p>Order Total: <strong>{total.toFixed(2)} points</strong></p>
              <p className="mt-2">Remaining Balance: <strong>{(walletBalance - total).toFixed(2)} points</strong></p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || (paymentMethod === "card" && !stripe)}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Processing..." : paymentMethod === "wallet" ? "Pay with Wallet" : paymentMethod === "cod" ? "Place Order" : "Pay Now"}
        </button>
      </div>
    </form>
  );
}

export default function CheckoutModal({ isOpen, onClose, cartItems, onOrderSuccess }: CheckoutModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<"select" | "checkout">("select");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card" | "wallet" | null>(null);

  // Validate cart products when modal opens
  useEffect(() => {
    const validateCartProducts = async () => {
      if (!isOpen || !session?.user?.accessToken) return;

      try {
        // Check each product in cart to see if it still exists
        const validationPromises = cartItems.map(async (item) => {
          try {
            const response = await axios.get(
              `${API_URL}/products/${item.productId._id}`,
              {
                headers: {
                  Authorization: `Bearer ${session.user.accessToken}`,
                },
              }
            );
            return { valid: true, productId: item.productId._id, name: item.productId.name };
          } catch (error: any) {
            if (error.response?.status === 404) {
              return { valid: false, productId: item.productId._id, name: item.productId.name };
            }
            return { valid: true, productId: item.productId._id, name: item.productId.name }; // Don't block on network errors
          }
        });

        const results = await Promise.all(validationPromises);
        const invalidProducts = results.filter(r => !r.valid);

        if (invalidProducts.length > 0) {
          const productNames = invalidProducts.map(p => p.name).join(', ');
          toast.error(
            `The following product(s) are no longer available: ${productNames}. Please remove them from your cart and try again.`,
            { duration: 6000 }
          );
          onClose();
        }
      } catch (error) {
        console.error("Error validating cart products:", error);
      }
    };

    validateCartProducts();
  }, [isOpen, session, cartItems, onClose]);

  const handlePaymentSelect = (method: "cod" | "card" | "wallet") => {
    setPaymentMethod(method);
    setStep("checkout");
  };

  const handleBack = () => {
    setStep("select");
    setPaymentMethod(null);
  };

  const handleSuccess = (orderId: string) => {
    onOrderSuccess();
    onClose();
    setStep("select");
    setPaymentMethod(null);
    // Navigate to success page with order ID
    router.push(`/order-success?orderId=${orderId}`);
  };

  const handleClose = () => {
    onClose();
    setStep("select");
    setPaymentMethod(null);
  };

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((sum, item) => sum + item.productId.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 pt-24">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === "select" ? "Select Payment Method" : "Checkout"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {step === "select" ? (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">
                Choose your preferred payment method. Order total: <span className="font-bold text-purple-600">${subtotal.toFixed(2)}</span>
              </p>

              {/* Warning if Stripe is not available */}
              {!stripePromise && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold">Card payment temporarily unavailable</p>
                      <p className="mt-1">Please use Cash on Delivery or check your network connection and reload the page.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cash on Delivery Option */}
              <button
                onClick={() => handlePaymentSelect("cod")}
                className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg text-gray-900">Cash on Delivery</h3>
                      <p className="text-sm text-gray-500">Pay when you receive your order</p>
                      <p className="text-xs text-orange-600 mt-1">+$250 COD charges apply</p>
                    </div>
                  </div>
                  <svg className="w-6 h-6 text-gray-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Card Payment Option */}
              <button
                onClick={() => handlePaymentSelect("card")}
                disabled={!stripePromise}
                className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg text-gray-900">Pay with Card</h3>
                      <p className="text-sm text-gray-500">Secure payment via Stripe</p>
                      {stripePromise ? (
                        <p className="text-xs text-green-600 mt-1">No extra charges</p>
                      ) : (
                        <p className="text-xs text-red-600 mt-1">Stripe not configured</p>
                      )}
                    </div>
                  </div>
                  <svg className="w-6 h-6 text-gray-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Wallet Payment Option */}
              <WalletPaymentOption 
                onSelect={() => handlePaymentSelect("wallet")}
                subtotal={subtotal}
              />
            </div>
          ) : (
            <div>
              <button
                onClick={handleBack}
                className="flex items-center text-purple-600 hover:text-purple-700 mb-4"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to payment methods
              </button>

              {/* Only render Stripe Elements if card payment is selected AND Stripe is loaded */}
              {paymentMethod === "card" && !stripePromise ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <div className="text-red-600 mb-4">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="font-semibold text-lg">Payment System Unavailable</h3>
                    <p className="text-sm mt-2">
                      Unable to load Stripe payment processor. This could be due to:
                    </p>
                    <ul className="text-sm mt-2 text-left max-w-md mx-auto list-disc list-inside space-y-1">
                      <li>Network connectivity issues</li>
                      <li>Stripe API configuration missing</li>
                      <li>Ad blocker or firewall blocking Stripe</li>
                    </ul>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleBack}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      Choose Different Payment
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Retry / Reload Page
                    </button>
                  </div>
                </div>
              ) : paymentMethod === "cod" ? (
                <Elements stripe={stripePromise}>
                  <CheckoutForm
                    cartItems={cartItems}
                    paymentMethod={paymentMethod}
                    onSuccess={handleSuccess}
                    onCancel={handleClose}
                  />
                </Elements>
              ) : (
                <Elements stripe={stripePromise}>
                  <CheckoutForm
                    cartItems={cartItems}
                    paymentMethod={paymentMethod!}
                    onSuccess={handleSuccess}
                    onCancel={handleClose}
                  />
                </Elements>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

