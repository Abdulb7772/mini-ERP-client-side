"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";
import toast from "react-hot-toast";
import { confirmToast } from "@/utils/confirmToast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface WishlistItem {
  productId: {
    _id: string;
    name: string;
    price: number;
    imageUrl?: string;
    stock?: number;
    category: string;
  };
  variationId?: {
    _id: string;
    name: string;
    size?: string;
    color?: string;
    price: number;
    stock: number;
  };
  addedAt: string;
}

interface Wishlist {
  _id: string;
  userId: string;
  items: WishlistItem[];
}

export default function WishlistPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchWishlist();
    }
  }, [status, router]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/wishlist`, {
        headers: {
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      });
      console.log("Wishlist response:", response.data);
      console.log("Wishlist data:", response.data.data);
      setWishlist(response.data.data);
    } catch (error: any) {
      console.error("Error fetching wishlist:", error);
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (productId: string, variationId?: string) => {
    try {
      setRemoving(`${productId}-${variationId || "none"}`);
      const response = await axios.delete(`${API_URL}/wishlist/remove`, {
        data: {
          productId,
          variationId,
        },
        headers: {
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      });
      setWishlist(response.data.data);
      toast.success("Removed from wishlist");
    } catch (error: any) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    } finally {
      setRemoving(null);
    }
  };

  const clearWishlist = async () => {
    confirmToast({
      title: "Clear Wishlist",
      message: "Are you sure you want to clear your wishlist?",
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await axios.delete(`${API_URL}/wishlist/clear`, {
            headers: {
              Authorization: `Bearer ${session?.user?.accessToken}`,
            },
          });
          setWishlist(response.data.data);
          toast.success("Wishlist cleared");
        } catch (error: any) {
          console.error("Error clearing wishlist:", error);
          toast.error("Failed to clear wishlist");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const moveToCart = async (item: WishlistItem) => {
    try {
      // Add to cart
      await axios.post(
        `${API_URL}/cart`,
        {
          productId: item.productId._id,
          variationId: item.variationId?._id,
          quantity: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${session?.user?.accessToken}`,
          },
        }
      );

      // Remove from wishlist
      await removeItem(item.productId._id, item.variationId?._id);
      
      toast.success("Moved to cart!", { icon: "🛒" });
    } catch (error: any) {
      console.error("Error moving to cart:", error);
      toast.error(error.response?.data?.message || "Failed to move to cart");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const isEmpty = !wishlist || wishlist.items.length === 0;
  
  console.log("Wishlist state:", wishlist);
  console.log("Is empty?", isEmpty);
  console.log("Items count:", wishlist?.items?.length);

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Wishlist</h1>
          {!isEmpty && (
            <button
              onClick={clearWishlist}
              className="text-red-400 hover:text-red-300 transition text-sm"
            >
              Clear Wishlist
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-white mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-gray-400 mb-6">
              Save your favorite items for later!
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <>
            {/* Product Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlist.items.map((item) => {
                const itemKey = `${item.productId._id}-${item.variationId?._id || "none"}`;
                const isRemoving = removing === itemKey;
                const currentPrice = item.variationId?.price || item.productId.price;
                const currentStock = item.variationId?.stock ?? item.productId.stock ?? 0;

                return (
                  <div
                    key={itemKey}
                    className="bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden group"
                  >
                    {/* Product Image */}
                    <div className="relative h-48 bg-gray-700 overflow-hidden">
                      {/* Remove Heart Button */}
                      <button
                        onClick={() => removeItem(item.productId._id, item.variationId?._id)}
                        disabled={isRemoving}
                        className="absolute top-2 left-2 z-10 p-2 rounded-full bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                        aria-label="Remove from wishlist"
                      >
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      </button>

                      {item.productId.imageUrl ? (
                        <img
                          src={item.productId.imageUrl}
                          alt={item.productId.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-purple-400 to-blue-500">
                          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Stock Badge */}
                      <div className="absolute top-3 right-3 bg-white dark:bg-gray-800 px-2 py-1 rounded-full text-xs font-semibold">
                        {currentStock > 0 ? (
                          <span className="text-green-600">In Stock</span>
                        ) : (
                          <span className="text-red-600">Out of Stock</span>
                        )}
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="p-4">
                      <div className="mb-1">
                        <span className="text-xs font-semibold text-purple-400 uppercase">
                          {item.productId.category}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        {item.productId.name}
                      </h3>
                      {item.variationId && (
                        <p className="text-sm text-gray-400 mb-2">
                          {[item.variationId.size, item.variationId.color]
                            .filter(Boolean)
                            .join(" - ")}
                        </p>
                      )}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold text-purple-400">
                          ${currentPrice.toFixed(2)}
                        </span>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => moveToCart(item)}
                        disabled={isRemoving || currentStock === 0}
                        className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold flex items-center justify-center gap-2"
                      >
                        {isRemoving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            Removing...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Add to Cart
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Bar */}
            <div className="bg-gray-800 rounded-lg p-6 mt-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Items in Wishlist</p>
                  <p className="text-2xl font-bold text-white">{wishlist.items.length}</p>
                </div>
                <button
                  onClick={() => router.push("/")}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
