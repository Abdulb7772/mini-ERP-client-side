"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import axiosInstance from "@/services/axios";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import AddToCartModal from "@/components/AddToCartModal";
import OrderNowModal from "@/components/OrderNowModal";
import CheckoutModal from "@/components/CheckoutModal";
import Footer from "@/components/Footer";

// Helper function to strip HTML tags
const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  description: string;
  imageUrl?: string;
  images?: string[];
  stock?: number;
  hasVariations?: boolean;
}

interface Variation {
  _id: string;
  productId: string;
  name: string;
  size?: string;
  color?: string;
  sku: string;
  price: number;
  stock: number;
}

interface DisplayProduct {
  _id: string;
  productId?: string; // Parent product ID for variations
  name: string;
  sku: string;
  category: string;
  price: number;
  description: string;
  imageUrl?: string;
  stock?: number;
  isVariation?: boolean;
  variationDetails?: string;
}

export default function ProductsPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DisplayProduct | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderProduct, setSelectedOrderProduct] = useState<DisplayProduct | null>(null);
  const [wishlistItems, setWishlistItems] = useState<Set<string>>(new Set());
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
    if (session?.user?.accessToken) {
      fetchWishlist();
    }
  }, [session]);

  const handleAddToCart = (product: DisplayProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleOrderNow = (product: DisplayProduct) => {
    setSelectedOrderProduct(product);
    setIsOrderModalOpen(true);
  };

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get("/products", {
        params: {
          limit: 1000,
          includeVariations: 'true'
        }
      });
      const productsData = response.data.data || response.data.products || [];
      
      // Expand products with variations
      const expandedProducts: DisplayProduct[] = [];
      
      for (const product of productsData) {
        if (product.hasVariations && product.variations) {
          // Use the variations already included in the response
          product.variations.forEach((variation: Variation) => {
            expandedProducts.push({
              _id: variation._id,
              productId: product._id, // Store parent product ID
              name: product.name,
              sku: variation.sku,
              category: product.category,
              price: variation.price,
              description: product.description,
              imageUrl: product.imageUrl || product.images?.[0],
              stock: variation.stock,
              isVariation: true,
              variationDetails: [variation.size, variation.color].filter(Boolean).join(' - ') || variation.name
            });
          });
        } else {
          // Add product as is
          expandedProducts.push({
            _id: product._id,
            name: product.name,
            sku: product.sku,
            category: product.category,
            price: product.price,
            description: product.description,
            imageUrl: product.imageUrl || product.images?.[0],
            stock: product.stock,
            isVariation: false
          });
        }
      }
      
      setProducts(expandedProducts);
    } catch (error: any) {
      console.error("Error fetching products:", error.response?.data || error.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    if (!session?.user?.accessToken) return;
    
    try {
      const response = await axiosInstance.get("/wishlist");
      const items = response.data.data?.items || [];
      const productIds = new Set<string>(items.map((item: any) => item.productId._id || item.productId));
      setWishlistItems(productIds);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    }
  };

  const toggleWishlist = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user?.accessToken) {
      toast.error("Please login to add items to wishlist");
      return;
    }

    const isInWishlist = wishlistItems.has(productId);

    try {
      if (isInWishlist) {
        await axiosInstance.delete("/wishlist/remove", {
          data: { productId },
        });
        setWishlistItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        toast.success("Removed from wishlist");
      } else {
        await axiosInstance.post(
          "/wishlist",
          { productId }
        );
        setWishlistItems((prev) => new Set(prev).add(productId));
        toast.success("Added to wishlist", {
          icon: "❤️",
        });
      }
    } catch (error: any) {
      console.error("Error toggling wishlist:", error);
      toast.error(error.response?.data?.message || "Failed to update wishlist");
    }
  };

  return (
    <>
      <section className="pt-3 pb-2 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-3xl font-bold text-white">
            View  All Products
          </h1>
        </div>
      </section>
      
      <div className="min-h-screen bg-gray-900">
        {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-start overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/60 to-transparent z-10"></div>
          <img 
            src="/pic1.png" 
            alt="Business Management" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              All-in-One Platform for Better Management
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-10 leading-relaxed">
              Secure, reliable, and built to support your business growth.
            </p>
            
          </div>
        </div>
      </section>
      

      {/* Products Grid Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700 animate-pulse">
                  <div className="h-64 bg-gray-700"></div>
                  <div className="p-6 space-y-3">
                    <div className="h-6 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="h-8 w-24 bg-gray-700 rounded"></div>
                      <div className="h-10 w-32 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {products.map((product) => (
                <div
                  key={product._id}
                  className="bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group"
                >
                  <div className="relative h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    {/* Wishlist Heart Button */}
                    <button
                      onClick={(e) => toggleWishlist(product._id, e)}
                      className="absolute top-2 left-2 z-10 p-2 rounded-full bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
                      aria-label={wishlistItems.has(product._id) ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      {wishlistItems.has(product._id) ? (
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      )}
                    </button>

                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-purple-400 to-blue-500">
                        <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    {product.stock !== undefined && (
                      <div className="absolute top-4 right-4 bg-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {product.stock > 0 ? (
                          <span className="text-green-600">In Stock</span>
                        ) : (
                          <span className="text-red-600">Out of Stock</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-400 uppercase">
                        {product.category}
                      </span>
                      {product.isVariation && product.variationDetails && (
                        <span className="text-xs font-semibold text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">
                          {product.variationDetails}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mb-1 line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-1">
                      {product.description ? stripHtml(product.description) : "No description available"}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-400">
                          ${product.price.toFixed(2)}
                        </span>
                        <Link
                          href={`/protected/product/${product.isVariation && product.productId ? product.productId : product._id}`}
                          className="px-3 py-1.5 text-sm bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300"
                        >
                          View Details
                        </Link>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock === 0}
                          className="flex-1 px-2 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                        </button>
                        <button
                          onClick={() => handleOrderNow(product)}
                          disabled={product.stock === 0}
                          className="flex-1 px-2 py-1.5 text-xs bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Order Now
                        </button>
                        
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                No products available at the moment
              </p>
            </div>
          )}
        </div>
      </section>

      <Footer />
      </div>

      {/* Add to Cart Modal */}
      {selectedProduct && (
        <AddToCartModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          product={selectedProduct as any}
          onProceedToCheckout={(items) => {
            setCheckoutItems(items);
            setIsModalOpen(false);
            setIsCheckoutModalOpen(true);
          }}
        />
      )}

      {/* Order Now Modal */}
      {selectedOrderProduct && (
        <OrderNowModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          product={selectedOrderProduct as any}
          onProceedToCheckout={(items) => {
            setCheckoutItems(items);
            setIsOrderModalOpen(false);
            setIsCheckoutModalOpen(true);
          }}
        />
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        cartItems={checkoutItems}
        onOrderSuccess={() => {
          setCheckoutItems([]);
          toast.success("Order placed successfully!");
          fetchProducts();
        }}
      />
    </>
  );
}
