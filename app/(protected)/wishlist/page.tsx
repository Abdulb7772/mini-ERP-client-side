"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import axiosInstance from "@/services/axios";
import toast from "react-hot-toast";
import AddToCartModal from "@/components/AddToCartModal";
import { confirmToast } from "@/utils/confirmToast";

interface WishlistItem {
  productId: {
    _id: string;
    name: string;
    price: number;
    imageUrl?: string;
    stock?: number;
    category: string;
    lowestPrice?: number;
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
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

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
      const response = await axiosInstance.get("/wishlist");
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
      const response = await axiosInstance.delete("/wishlist/remove", {
        data: {
          productId,
          variationId,
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
          const response = await axiosInstance.delete("/wishlist/clear");
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
      await axiosInstance.post(
        "/cart",
        {
          productId: item.productId._id,
          variationId: item.variationId?._id,
          quantity: 1,
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
      <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-9 w-48 bg-gray-700 rounded animate-pulse mb-8"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 animate-pulse">
                <div className="h-64 bg-gray-700"></div>
                <div className="p-6 space-y-3">
                  <div className="h-6 w-3/4 bg-gray-700 rounded"></div>
                  <div className="h-4 w-full bg-gray-700 rounded"></div>
                  <div className="h-4 w-2/3 bg-gray-700 rounded"></div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="h-8 w-24 bg-gray-700 rounded"></div>
                    <div className="h-10 w-10 bg-gray-700 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !wishlist || wishlist.items.length === 0;

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
              onClick={() => router.push("/products")}
              className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Wishlist Items */}
            <div className="lg:col-span-2 space-y-4">
              {wishlist.items.map((item) => {
                const itemKey = `${item.productId._id}-${item.variationId?._id || "none"}`;
                const isRemoving = removing === itemKey;
                const displayPrice = item.variationId?.price || item.productId?.lowestPrice || item.productId?.price || 0;
                const currentStock = item.variationId?.stock ?? item.productId?.stock ?? 0;

                return (
                  <div
                    key={itemKey}
                    className="bg-gray-800 rounded-lg p-4 flex gap-4 hover:bg-gray-750 transition-colors cursor-pointer"
                    onClick={() => router.push(`/product/${item.productId._id}`)}
                  >
                    {/* Product Image */}
                    <div className="w-24 h-24 bg-gray-700 rounded-lg overflow-hidden shrink-0">
                      {item.productId.imageUrl ? (
                        <img
                          src={item.productId.imageUrl}
                          alt={item.productId.name}
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
                        {item.productId.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {item.productId.category}
                      </p>
                      {item.variationId && (
                        <p className="text-sm text-gray-400">
                          {[item.variationId.size, item.variationId.color]
                            .filter(Boolean)
                            .join(" - ")}
                        </p>
                      )}
                      <p className="text-purple-400 font-bold mt-2">
                        {item.productId?.lowestPrice && item.productId.lowestPrice < item.productId.price ? (
                          <>
                            <span className="text-sm text-gray-500">From </span>
                            ${displayPrice.toFixed(2)}
                          </>
                        ) : (
                          `$${displayPrice.toFixed(2)}`
                        )}
                      </p>
                      {currentStock > 0 ? (
                        <p className="text-green-400 text-sm mt-1">In Stock</p>
                      ) : (
                        <p className="text-red-400 text-sm mt-1">Out of Stock</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/product/${item.productId._id}`);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct({
                            _id: item.productId._id,
                            name: item.productId.name,
                            price: item.productId.price,
                            imageUrl: item.productId.imageUrl,
                            stock: item.productId.stock,
                            category: item.productId.category,
                            hasVariations: !!item.variationId,
                          });
                          setIsCartModalOpen(true);
                        }}
                        disabled={isRemoving || currentStock === 0}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-semibold flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Add to Cart
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.productId._id, item.variationId?._id);
                        }}
                        disabled={isRemoving}
                        className="px-4 py-2 bg-gray-700 text-red-400 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition text-sm font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-lg p-6 sticky top-4">
                <h2 className="text-xl font-bold text-white mb-4">Wishlist Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-400">
                    <span>Total Items:</span>
                    <span className="text-white font-semibold">{wishlist.items.length}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-3">
                    <button
                      onClick={() => router.push("/products")}
                      className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add to Cart Modal */}
      {selectedProduct && (
        <AddToCartModal
          isOpen={isCartModalOpen}
          onClose={() => {
            setIsCartModalOpen(false);
            setSelectedProduct(null);
            fetchWishlist(); // Refresh wishlist after adding to cart
          }}
          product={selectedProduct}
        />
      )}
    </div>
  );
}

