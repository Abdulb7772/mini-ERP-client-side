"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import AddToCartModal from "@/components/AddToCartModal";
import OrderNowModal from "@/components/OrderNowModal";
import CheckoutModal from "@/components/CheckoutModal";
import Footer from "@/components/Footer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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
  lowestPrice?: number;
}

export default function Home() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderProduct, setSelectedOrderProduct] = useState<Product | null>(null);
  const [wishlistItems, setWishlistItems] = useState<Set<string>>(new Set());
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);

  useEffect(() => {
    console.log("Fetching products from:", `${API_URL}/products`);
    fetchProducts();
    if (session?.user?.accessToken) {
      fetchWishlist();
    }
  }, [session]);

  const fetchWishlist = async () => {
    if (!session?.user?.accessToken) return;
    
    try {
      const response = await axios.get(`${API_URL}/wishlist`, {
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      });
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
      handleProtectedAction("/login");
      return;
    }

    const isInWishlist = wishlistItems.has(productId);

    try {
      if (isInWishlist) {
        await axios.delete(`${API_URL}/wishlist/remove`, {
          data: { productId },
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
        });
        setWishlistItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        toast.success("Removed from wishlist");
      } else {
        await axios.post(
          `${API_URL}/wishlist`,
          { productId },
          {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
            },
          }
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

  const handleAddToCart = (product: Product) => {
    if (!session?.user?.accessToken) {
      toast.error("Please login to add items to cart");
      handleProtectedAction("/login");
      return;
    }
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleOrderNow = (product: Product) => {
    if (!session?.user?.accessToken) {
      toast.error("Please login to place an order");
      handleProtectedAction("/login");
      return;
    }
    setSelectedOrderProduct(product);
    setIsOrderModalOpen(true);
  };

  const fetchProducts = async () => {
    try {
      console.log('=== FETCHING PRODUCTS ===');
      console.log('API_URL:', API_URL);
      console.log('Full URL:', `${API_URL}/products`);
      
      // Fetch products without authentication since it's a public route
      const response = await axios.get(`${API_URL}/products`, {
        params: {
          limit: 6,
          page: 1
        }
      });
      
      console.log('Products response status:', response.status);
      console.log('Products response data:', response.data);
      
      const productsData = response.data.data || response.data.products || [];
      console.log('Products found:', productsData.length);
      
      // Backend now returns lowestPrice for products with variations
      setProducts(productsData);
    } catch (error: any) {
      console.error('=== ERROR FETCHING PRODUCTS ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.message);
      console.error('Error status:', error.response?.status);
      // Set empty array on error so page still renders
      setProducts([]);
      toast.error('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      console.log('=== PRODUCTS FETCH COMPLETE ===');
    }
  };

  const handleProtectedAction = (redirectPath: string) => {
    // Redirect to login with the intended destination
    window.location.href = `/login?redirect=${encodeURIComponent(redirectPath)}`;
  };
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-start pt-16 overflow-hidden">
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
            <button
              onClick={() => {
                handleProtectedAction("/protected/products");
                setIsMenuOpen(false);
              }}
              className="inline-block px-10 py-4 bg-white text-gray-900 text-lg font-semibold rounded-md hover:bg-gray-100 transition-all duration-300 shadow-lg"
            >
              Order Now
            </button>
          </div>
        </div>
        
       
      </section>

      {/* Products Section */}
      <section id="products" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Our Products
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Explore our featured products available for you
            </p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-300 dark:bg-gray-700"></div>
                  <div className="p-4">
                    <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded mb-3"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div
                    key={product._id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden group"
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
                        <div className="absolute top-3 right-3 bg-white dark:bg-gray-800 px-2 py-1 rounded-full text-xs font-semibold">
                          {product.stock > 0 ? (
                            <span className="text-green-600">In Stock</span>
                          ) : (
                            <span className="text-red-600">Out of Stock</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-1">
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">
                          {product.category}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                        {product.description ? stripHtml(product.description) : "No description available"}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {product.hasVariations && product.lowestPrice ? (
                              <span>From ${product.lowestPrice.toFixed(2)}</span>
                            ) : (
                              <span>${product.price.toFixed(2)}</span>
                            )}
                          </span>
                          <Link
                            href={`/protected/product/${product._id}`}
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
              <div className="text-center mt-12">
            <button
              onClick={() => {
                handleProtectedAction("/protected/products");
                setIsMenuOpen(false);
              }}
              className="inline-block px-8 py-4 bg-linear-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-full hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              View All Products
            </button>
              </div>
            </>
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

      {/* About Us Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              About MiniERP
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Your complete business management solution designed for modern enterprises
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Why Choose MiniERP?
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                MiniERP is designed to simplify business operations for small to medium-sized enterprises. Our intuitive platform brings together all essential business functions in one place.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Easy to use interface with minimal learning curve</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Real-time updates and notifications</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Secure and reliable cloud-based solution</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Scalable architecture that grows with your business</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square bg-linear-to-br from-blue-500 to-purple-600 rounded-3xl opacity-20 absolute inset-0 blur-3xl"></div>
              <div className="relative bg-gray-900 p-8 rounded-3xl shadow-2xl">
                <div className="space-y-4">
                  <div className="h-4 bg-linear-to-r from-blue-500 to-purple-600 rounded w-3/4"></div>
                  <div className="h-4 bg-linear-to-r from-blue-300 to-purple-400 rounded w-1/2"></div>
                  <div className="h-4 bg-linear-to-r from-blue-200 to-purple-300 rounded w-5/6"></div>
                  <div className="grid grid-cols-2 gap-4 pt-6">
                    <div className="p-4 bg-blue-900/20 rounded-xl">
                      <div className="text-3xl font-bold text-blue-400">500+</div>
                      <div className="text-sm text-gray-400">Active Users</div>
                    </div>
                    <div className="p-4 bg-purple-900/20 rounded-xl">
                      <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">99.9%</div>
                      <div className="text-sm text-gray-400">Uptime</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Features Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Inventory Management</h4>
              <p className="text-gray-600 dark:text-gray-300">Track stock levels and manage products efficiently</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-linear-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Order Processing</h4>
              <p className="text-gray-600 dark:text-gray-300">Streamline orders from creation to fulfillment</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-linear-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Analytics & Reports</h4>
              <p className="text-gray-600 dark:text-gray-300">Comprehensive insights for better decisions</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/about"
              className="inline-block px-8 py-4 bg-linear-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-full hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Learn More About Us
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* Add to Cart Modal */}
      {selectedProduct && (
        <AddToCartModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          product={selectedProduct}
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
          product={selectedOrderProduct}
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
    </div>
  );
}
