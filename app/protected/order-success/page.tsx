"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface OrderItem {
  productId: {
    _id: string;
    name: string;
  };
  variationId?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface OrderDetails {
  _id: string;
  orderNumber: string;
  customerId: {
    name: string;
    email: string;
    address: string;
  };
  items: OrderItem[];
  totalAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
  notes?: string;
}

function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && orderId) {
      fetchOrderDetails();
    } else if (status === "authenticated" && !orderId) {
      setLoading(false);
    }
  }, [status, orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      });
      
      setOrderDetails(response.data.data);
    } catch (error: any) {
      console.error("Error fetching order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!orderId || !orderDetails) return;

    try {
      setCanceling(true);
      await axios.post(
        `${API_URL}/orders/${orderId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${session?.user?.accessToken}`,
          },
        }
      );

      toast.success("Order cancelled successfully! Redirecting to home...");
      setShowCancelConfirm(false);
      
      // Redirect to home page after successful cancellation
      setTimeout(() => {
        router.push("/protected/products");
      }, 1500);
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      toast.error(error.response?.data?.message || "Failed to cancel order");
    } finally {
      setCanceling(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          <p className="text-white mt-4">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!orderId || !orderDetails) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No Order Found</h2>
          <p className="text-gray-400 mb-6">
            We couldn't find any order information. Please check your orders history.
          </p>
          <Link
            href="/protected/products"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="bg-linear-to-r from-green-600 to-green-500 rounded-2xl shadow-2xl p-8 mb-8 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Order Confirmed!</h1>
          <p className="text-green-100 text-lg">
            Thank you for your order. We've sent a confirmation email to {orderDetails.customerId.email}
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden mb-8">
          <div className="bg-linear-to-r from-purple-600 to-blue-600 px-6 py-4">
            <h2 className="text-2xl font-bold text-white">Order Details</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Order Info Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Order Number</p>
                  <p className="text-white font-semibold text-lg">{orderDetails.orderNumber}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Order Date</p>
                  <p className="text-white font-semibold">{formatDate(orderDetails.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Payment Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    orderDetails.paymentStatus === "paid"
                      ? "bg-green-600/20 text-green-400"
                      : orderDetails.paymentStatus === "pending"
                      ? "bg-yellow-600/20 text-yellow-400"
                      : "bg-red-600/20 text-red-400"
                  }`}>
                    {orderDetails.paymentStatus.charAt(0).toUpperCase() + orderDetails.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Customer Name</p>
                  <p className="text-white font-semibold">{orderDetails.customerId.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Delivery Address</p>
                  <p className="text-white font-semibold">{orderDetails.customerId.address}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Order Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    orderDetails.status === "delivered"
                      ? "bg-green-600/20 text-green-400"
                      : orderDetails.status === "processing"
                      ? "bg-blue-600/20 text-blue-400"
                      : orderDetails.status === "shipped"
                      ? "bg-purple-600/20 text-purple-400"
                      : "bg-gray-600/20 text-gray-400"
                  }`}>
                    {orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-xl font-bold text-white mb-4">Order Items</h3>
              <div className="space-y-3">
                {orderDetails.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-gray-700/50 rounded-lg p-4"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold">{item.productId.name}</p>
                      <p className="text-gray-400 text-sm">
                        Quantity: {item.quantity} × ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">${item.subtotal.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Amount */}
            <div className="border-t border-gray-700 pt-6">
              <div className="flex justify-between items-center bg-linear-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-6">
                <span className="text-white text-2xl font-bold">Total Amount</span>
                <span className="text-green-400 text-3xl font-bold">${orderDetails.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {orderDetails.notes && (
              <div className="border-t border-gray-700 pt-6">
                <p className="text-gray-400 text-sm mb-1">Order Notes</p>
                <p className="text-white">{orderDetails.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/protected/products"
            className="flex-1 px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition text-center flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Continue Shopping
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition text-center flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </button>
          {orderDetails.status !== "cancelled" && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={canceling}
              className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition text-center flex items-center justify-center gap-2"
            >
              {canceling ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Cancelling...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel Order
                </>
              )}
            </button>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400 mb-2">Need help with your order?</p>
          <Link
            href="/contact"
            className="text-purple-400 hover:text-purple-300 font-semibold transition"
          >
            Contact Support →
          </Link>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center justify-center w-16 h-16 bg-red-600/20 rounded-full mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">Cancel Order?</h3>
            <p className="text-gray-400 text-center mb-6">
              Are you sure you want to cancel this order? The items will be returned to stock.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={canceling}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition disabled:opacity-50"
              >
                No, Keep Order
              </button>
              <button
                onClick={cancelOrder}
                disabled={canceling}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {canceling ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Cancelling...
                  </>
                ) : (
                  "Yes, Cancel Order"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mx-auto"></div>
            <p className="text-white mt-4">Loading order details...</p>
          </div>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
