"use client";

import { useState, useEffect } from "react";
import axiosInstance from "@/services/axios";
import toast from "react-hot-toast";

interface OrderItem {
  productId: {
    _id: string;
    name: string;
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
}

interface AttachmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachmentType: "order" | "product" | "customer" | null;
  attachmentId: string | null;
}

export default function AttachmentDetailsModal({
  isOpen,
  onClose,
  attachmentType,
  attachmentId,
}: AttachmentDetailsModalProps) {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && attachmentType === "order" && attachmentId) {
      fetchOrderDetails();
    }
  }, [isOpen, attachmentType, attachmentId]);

  const fetchOrderDetails = async () => {
    if (!attachmentId) return;

    try {
      setLoading(true);
      const response = await axiosInstance.get(`/orders/${attachmentId}`);
      setOrderDetails(response.data.data);
    } catch (error: any) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !attachmentType || !attachmentId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-linear-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {attachmentType === "order" && "Order Details"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : attachmentType === "order" && orderDetails ? (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Order Number</p>
                  <p className="text-white font-semibold text-lg">
                    {orderDetails.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Order Date</p>
                  <p className="text-white font-semibold">
                    {new Date(orderDetails.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Payment Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      orderDetails.paymentStatus === "paid"
                        ? "bg-green-600/20 text-green-400"
                        : orderDetails.paymentStatus === "pending"
                        ? "bg-yellow-600/20 text-yellow-400"
                        : "bg-red-600/20 text-red-400"
                    }`}
                  >
                    {orderDetails.paymentStatus.charAt(0).toUpperCase() +
                      orderDetails.paymentStatus.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Order Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      orderDetails.status === "delivered" ||
                      orderDetails.status === "completed"
                        ? "bg-green-600/20 text-green-400"
                        : orderDetails.status === "shipped"
                        ? "bg-purple-600/20 text-purple-400"
                        : orderDetails.status === "processing"
                        ? "bg-blue-600/20 text-blue-400"
                        : "bg-yellow-600/20 text-yellow-400"
                    }`}
                  >
                    {orderDetails.status.charAt(0).toUpperCase() +
                      orderDetails.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="border-t border-gray-700 pt-4">
                <p className="text-gray-400 text-sm mb-3">Customer Information</p>
                <div className="space-y-2">
                  <p className="text-white">
                    <span className="font-semibold">Name:</span>{" "}
                    {orderDetails.customerId?.name || "N/A"}
                  </p>
                  <p className="text-white">
                    <span className="font-semibold">Email:</span>{" "}
                    {orderDetails.customerId?.email || "N/A"}
                  </p>
                  <p className="text-white">
                    <span className="font-semibold">Address:</span>{" "}
                    {orderDetails.customerId.address}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t border-gray-700 pt-4">
                <p className="text-gray-400 text-sm mb-3">Order Items</p>
                <div className="space-y-3">
                  {orderDetails.items.map((item, index) => {
                    const productImage =
                      item.productId.imageUrl ||
                      item.productId.images?.[0] ||
                      "/placeholder.png";

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-4 bg-gray-700/50 rounded-lg p-3"
                      >
                        <div className="w-16 h-16 shrink-0 bg-gray-800 rounded overflow-hidden">
                          <img
                            src={productImage}
                            alt={item.productId.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder.png";
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">
                            {item.productId.name}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Quantity: {item.quantity} × ${item.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">
                            ${item.subtotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between items-center bg-linear-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-4">
                  <span className="text-white text-xl font-bold">
                    Total Amount
                  </span>
                  <span className="text-green-400 text-2xl font-bold">
                    ${orderDetails.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
