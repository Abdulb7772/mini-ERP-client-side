"use client";

import { useState, useEffect } from "react";
import axiosInstance from "@/services/axios";
import toast from "react-hot-toast";

interface Order {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface AttachmentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: "order", id: string) => void;
}

export default function AttachmentSelector({
  isOpen,
  onClose,
  onSelect,
}: AttachmentSelectorProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/orders/my-orders");
      setOrders(response.data.data || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (orderId: string) => {
    onSelect("order", orderId);
    onClose();
  };

  const filteredOrders = orders.filter((order) =>
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-linear-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Select Order to Attach</h2>
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

        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            placeholder="Search by order number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="text-gray-400">No orders found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map((order) => (
                <button
                  key={order._id}
                  onClick={() => handleSelect(order._id)}
                  className="w-full text-left p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition border border-gray-600 hover:border-purple-500"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">
                      Order #{order.orderNumber}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        order.status === "delivered" || order.status === "completed"
                          ? "bg-green-600/20 text-green-400"
                          : order.status === "shipped"
                          ? "bg-purple-600/20 text-purple-400"
                          : order.status === "processing"
                          ? "bg-blue-600/20 text-blue-400"
                          : "bg-yellow-600/20 text-yellow-400"
                      }`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>${order.totalAmount.toFixed(2)}</span>
                    <span>
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
