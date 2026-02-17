"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import axios from "axios";
import toast from "react-hot-toast";
import ComplaintModal from "@/components/ComplaintModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface OrderItem {
  productId: {
    _id: string;
    name: string;
    sku?: string;
    imageUrl?: string;
    images?: string[];
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

interface Complaint {
  _id: string;
  subject: string;
  description: string;
  status: "pending" | "in-review" | "resolved" | "rejected";
  priority: "low" | "medium" | "high";
  attachments?: string[];
  response?: string;
  respondedBy?: {
    name: string;
    email: string;
  };
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [canFileComplaint, setCanFileComplaint] = useState(false);
  const [complaintMessage, setComplaintMessage] = useState("");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  
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
      
      // Check if complaint can be filed
      checkComplaintEligibility();
      
      // Fetch complaints for this order
      fetchComplaints();
    } catch (error: any) {
      console.error("Error fetching order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoadingComplaints(true);
      const response = await axios.get(`${API_URL}/complaints/my-complaints`, {
        headers: {
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      });
      
      // Filter complaints for this specific order
      const orderComplaints = response.data.data.filter(
        (complaint: any) => complaint.orderId._id === orderId
      );
      setComplaints(orderComplaints);
    } catch (error: any) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const checkComplaintEligibility = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/complaints/can-file/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${session?.user?.accessToken}`,
          },
        }
      );
      
      setCanFileComplaint(response.data.canFile);
      setComplaintMessage(response.data.message || "");
    } catch (error: any) {
      console.error("Error checking complaint eligibility:", error);
      setCanFileComplaint(false);
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
      <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 text-center animate-pulse">
            <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4"></div>
            <div className="h-10 w-64 bg-gray-700 rounded mx-auto mb-2"></div>
            <div className="h-6 w-96 bg-gray-700 rounded mx-auto"></div>
          </div>
          <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-pulse">
            <div className="bg-gray-700 px-6 py-4">
              <div className="h-7 w-40 bg-gray-600 rounded"></div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="h-4 w-32 bg-gray-700 rounded"></div>
                  <div className="h-6 w-48 bg-gray-700 rounded"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 w-32 bg-gray-700 rounded"></div>
                  <div className="h-6 w-48 bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          </div>
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

  // Get order status styling and message
  const getOrderStatusDetails = (status: string) => {
    switch (status) {
      case "pending":
        return {
          gradient: "from-yellow-600 to-yellow-500",
          icon: (
            <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: "Order Pending",
          message: "Your order has been received and is awaiting confirmation."
        };
      case "processing":
        return {
          gradient: "from-blue-600 to-blue-500",
          icon: (
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
          title: "Order Processing",
          message: "Your order is being processed and prepared for packaging."
        };
      case "shipped":
        return {
          gradient: "from-purple-600 to-purple-500",
          icon: (
            <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          ),
          title: "Order Shipped",
          message: "Your order has been packaged and shipped. It's on the way!"
        };
      case "delivered":
        return {
          gradient: "from-green-600 to-green-500",
          icon: (
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ),
          title: "Order Delivered",
          message: "Your order has been successfully delivered!"
        };
      case "completed":
        return {
          gradient: "from-green-600 to-green-500",
          icon: (
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ),
          title: "Order Completed",
          message: "Your order has been completed. Thank you for your purchase!"
        };
      case "cancelled":
        return {
          gradient: "from-red-600 to-red-500",
          icon: (
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          title: "Order Cancelled",
          message: "This order has been cancelled."
        };
      default:
        return {
          gradient: "from-green-600 to-green-500",
          icon: (
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ),
          title: "Order Confirmed!",
          message: "Thank you for your order."
        };
    }
  };

  const statusDetails = getOrderStatusDetails(orderDetails.status);

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className={`bg-linear-to-r ${statusDetails.gradient} rounded-2xl shadow-2xl p-8 mb-8 text-center`}>
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            {statusDetails.icon}
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{statusDetails.title}</h1>
          <p className="text-white/90 text-lg">
            {statusDetails.message}
          </p>
          <p className="text-white/80 text-sm mt-2">
            Confirmation email sent to {orderDetails.customerId.email}
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
                <div>
                  <p className="text-gray-400 text-sm mb-1">Order Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    orderDetails.status === "delivered" || orderDetails.status === "completed"
                      ? "bg-green-600/20 text-green-400"
                      : orderDetails.status === "shipped"
                      ? "bg-purple-600/20 text-purple-400"
                      : orderDetails.status === "processing"
                      ? "bg-blue-600/20 text-blue-400"
                      : orderDetails.status === "pending"
                      ? "bg-yellow-600/20 text-yellow-400"
                      : "bg-red-600/20 text-red-400"
                  }`}>
                    {orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}
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

            {/* Order Status Timeline */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-xl font-bold text-white mb-6">Order Status</h3>
              <div className="relative">
                <div className="flex justify-between items-center">
                  {/* Pending */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      ["pending", "processing", "packaging", "shipped", "delivered", "completed"].includes(orderDetails.status)
                        ? "bg-green-600"
                        : "bg-gray-700"
                    }`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-white text-xs mt-2 text-center">Confirmed</p>
                  </div>
                  
                  <div className={`flex-1 h-1 ${
                    ["processing", "packaging", "shipped", "delivered", "completed"].includes(orderDetails.status)
                      ? "bg-green-600"
                      : "bg-gray-700"
                  }`}></div>
                  
                  {/* Processing */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      ["processing", "packaging", "shipped", "delivered", "completed"].includes(orderDetails.status)
                        ? "bg-green-600"
                        : "bg-gray-700"
                    }`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <p className="text-white text-xs mt-2 text-center">Processing</p>
                  </div>
                  
                  <div className={`flex-1 h-1 ${
                    ["packaging", "shipped", "delivered", "completed"].includes(orderDetails.status)
                      ? "bg-green-600"
                      : "bg-gray-700"
                  }`}></div>
                  
                  {/* Packaging */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      ["packaging", "shipped", "delivered", "completed"].includes(orderDetails.status)
                        ? "bg-green-600"
                        : "bg-gray-700"
                    }`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p className="text-white text-xs mt-2 text-center">Packaging</p>
                  </div>
                  
                  <div className={`flex-1 h-1 ${
                    ["shipped", "delivered", "completed"].includes(orderDetails.status)
                      ? "bg-green-600"
                      : "bg-gray-700"
                  }`}></div>
                  
                  {/* Shipped */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      ["shipped", "delivered", "completed"].includes(orderDetails.status)
                        ? "bg-green-600"
                        : "bg-gray-700"
                    }`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </div>
                    <p className="text-white text-xs mt-2 text-center">Shipped</p>
                  </div>
                  
                  <div className={`flex-1 h-1 ${
                    ["delivered", "completed"].includes(orderDetails.status)
                      ? "bg-green-600"
                      : "bg-gray-700"
                  }`}></div>
                  
                  {/* Delivered */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      ["delivered", "completed"].includes(orderDetails.status)
                        ? "bg-green-600"
                        : "bg-gray-700"
                    }`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <p className="text-white text-xs mt-2 text-center">Delivered</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-xl font-bold text-white mb-4">Order Items</h3>
              <div className="space-y-3">
                {orderDetails.items.map((item, index) => {
                  const productImage = item.productId.imageUrl || item.productId.images?.[0] || '/placeholder.png';
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-4 bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition"
                    >
                      {/* Product Image */}
                      <div className="w-20 h-20 flex-shrink-0 bg-gray-800 rounded-lg overflow-hidden">
                        <img
                          src={productImage}
                          alt={item.productId.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.png';
                          }}
                        />
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-lg truncate">{item.productId.name}</p>
                        {item.productId.sku && (
                          <p className="text-gray-500 text-xs mt-0.5">SKU: {item.productId.sku}</p>
                        )}
                        <p className="text-gray-400 text-sm mt-1">
                          Quantity: {item.quantity} × ${item.price.toFixed(2)}
                        </p>
                      </div>
                      
                      {/* Subtotal */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-white font-bold text-lg">${item.subtotal.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
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
          {canFileComplaint && (
            <button
              onClick={() => setShowComplaintModal(true)}
              className="flex-1 px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition text-center flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              File Complaint
            </button>
          )}
          {orderDetails.status !== "cancelled" && orderDetails.status !== "delivered" && (
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

        {/* Complaint Info Message */}
        {!canFileComplaint && complaintMessage && orderDetails.status !== "delivered" && (
          <div className="mt-4 bg-yellow-600/20 border border-yellow-600 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-yellow-100 text-sm">{complaintMessage}</p>
            </div>
          </div>
        )}

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

      {/* Complaint Modal */}
      {showComplaintModal && orderDetails && (
        <ComplaintModal
          isOpen={showComplaintModal}
          onClose={() => setShowComplaintModal(false)}
          orderId={orderDetails._id}
          orderNumber={orderDetails.orderNumber}
          accessToken={session?.user?.accessToken || ""}
          onSuccess={() => {
            checkComplaintEligibility();
            fetchComplaints();
          }}
        />
      )}

      {/* Complaints Section */}
      {complaints.length > 0 && (
        <div className="mt-8 bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Your Complaints ({complaints.length})
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {complaints.map((complaint) => (
              <div
                key={complaint._id}
                className="bg-gray-750 rounded-lg border border-gray-700 overflow-hidden"
              >
                {/* Complaint Header */}
                <div className="bg-gray-750 px-4 py-3 border-b border-gray-700 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        complaint.status === "pending"
                          ? "bg-yellow-600/20 text-yellow-400 border border-yellow-600/50"
                          : complaint.status === "in-review"
                          ? "bg-blue-600/20 text-blue-400 border border-blue-600/50"
                          : complaint.status === "resolved"
                          ? "bg-green-600/20 text-green-400 border border-green-600/50"
                          : "bg-red-600/20 text-red-400 border border-red-600/50"
                      }`}
                    >
                      {complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1)}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        complaint.priority === "high"
                          ? "bg-red-600/20 text-red-400 border border-red-600/50"
                          : complaint.priority === "medium"
                          ? "bg-orange-600/20 text-orange-400 border border-orange-600/50"
                          : "bg-gray-600/20 text-gray-400 border border-gray-600/50"
                      }`}
                    >
                      {complaint.priority.charAt(0).toUpperCase() + complaint.priority.slice(1)} Priority
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    {new Date(complaint.createdAt).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Complaint Body */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-1">{complaint.subject}</h3>
                    <div
                      className="text-gray-300 text-sm prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: complaint.description }}
                    />
                  </div>

                  {/* Attachments */}
                  {complaint.attachments && complaint.attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-gray-400 text-sm font-semibold">Attachments:</p>
                      <div className="flex flex-wrap gap-2">
                        {complaint.attachments.map((url, idx) => {
                          const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              {isImage ? (
                                <img
                                  src={url}
                                  alt={`Attachment ${idx + 1}`}
                                  className="w-20 h-20 object-cover rounded border border-gray-600 hover:border-purple-500 transition"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-gray-700 rounded border border-gray-600 hover:border-purple-500 transition flex items-center justify-center">
                                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Admin Response */}
                  {complaint.response && (
                    <div className="mt-4 bg-gradient-to-r from-green-600/10 to-blue-600/10 border-2 border-green-600/40 rounded-lg p-4 shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shrink-0 shadow-md">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-green-400 font-bold text-base flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                              Reply from Support Team
                              {complaint.respondedBy && (
                                <span className="text-green-400/80 font-medium ml-1 text-sm">
                                  - {complaint.respondedBy.name}
                                </span>
                              )}
                            </p>
                            {complaint.respondedAt && (
                              <p className="text-green-400/70 text-xs">
                                {new Date(complaint.respondedAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>
                          <div
                            className="text-green-50 text-sm prose prose-invert max-w-none bg-gray-800/50 rounded p-3"
                            dangerouslySetInnerHTML={{ __html: complaint.response }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
        <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 text-center animate-pulse">
              <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4"></div>
              <div className="h-10 w-64 bg-gray-700 rounded mx-auto mb-2"></div>
              <div className="h-6 w-96 bg-gray-700 rounded mx-auto"></div>
            </div>
            <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-pulse">
              <div className="bg-gray-700 px-6 py-4">
                <div className="h-7 w-40 bg-gray-600 rounded"></div>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="h-4 w-32 bg-gray-700 rounded"></div>
                    <div className="h-6 w-48 bg-gray-700 rounded"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 w-32 bg-gray-700 rounded"></div>
                    <div className="h-6 w-48 bg-gray-700 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
