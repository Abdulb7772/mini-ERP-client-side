"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface OrderItem {
  productId: {
    _id: string;
    name: string;
  };
  quantity: number;
  price: number;
  subtotal: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchOrders();
    }
  }, [status]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/orders`, {
        headers: {
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      });

      // Filter orders for current customer if user is a customer
      const ordersData = response.data.data || [];
      setOrders(ordersData);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-10 w-48 bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-6 w-64 bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 w-32 bg-gray-700 rounded"></div>
                  <div className="h-6 w-20 bg-gray-700 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-700 rounded"></div>
                  <div className="h-4 w-3/4 bg-gray-700 rounded"></div>
                  <div className="h-4 w-1/2 bg-gray-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Orders</h1>
          <p className="text-gray-400">View and track all your orders</p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-12 text-center">
            <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Orders Yet</h2>
            <p className="text-gray-400 mb-6">
              You haven't placed any orders yet. Start shopping to see your orders here.
            </p>
            <Link
              href="/protected/products"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order._id}
                href={`/protected/order-success?orderId=${order._id}`}
                className="block bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-white">{order.orderNumber}</h3>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          order.status === "delivered"
                            ? "bg-green-600/20 text-green-400"
                            : order.status === "processing"
                            ? "bg-blue-600/20 text-blue-400"
                            : order.status === "shipped"
                            ? "bg-purple-600/20 text-purple-400"
                            : order.status === "cancelled"
                            ? "bg-red-600/20 text-red-400"
                            : "bg-gray-600/20 text-gray-400"
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          order.paymentStatus === "paid"
                            ? "bg-green-600/20 text-green-400"
                            : order.paymentStatus === "unpaid"
                            ? "bg-yellow-600/20 text-yellow-400"
                            : "bg-orange-600/20 text-orange-400"
                        }`}>
                          {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(order.createdAt)}
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          {order.items.length} {order.items.length === 1 ? "item" : "items"}
                        </div>
                      </div>

                      {/* Order Items Preview */}
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2">
                          {order.items.slice(0, 3).map((item, index) => (
                            <span key={index} className="text-sm text-gray-300">
                              {item.productId.name} (×{item.quantity})
                              {index < Math.min(2, order.items.length - 1) && <span className="text-gray-600">,</span>}
                            </span>
                          ))}
                          {order.items.length > 3 && (
                            <span className="text-sm text-gray-500">+{order.items.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order Total and Action */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-400 mb-1">Total Amount</p>
                        <p className="text-2xl font-bold text-green-400">${order.totalAmount.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center text-purple-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
