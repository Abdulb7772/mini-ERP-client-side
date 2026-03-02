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
  // For variations
  productId?: string; // Parent product ID when this is a variation
  isVariation?: boolean;
  variationDetails?: string;
}

export default function Home() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderProduct, setSelectedOrderProduct] = useState<Product | null>(null);
  const [wishlistItems, setWishlistItems] = useState<Set<string>>(new Set());
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    console.log("Fetching products from:", `${API_URL}/products`);
    fetchProducts();
    if (session?.user?.accessToken) {
      fetchWishlist();
    }
  }, [session]);

  useEffect(() => {
    // Filter products when category changes
    if (selectedCategory === "All") {
      setProducts(allProducts);
    } else {
      setProducts(allProducts.filter(p => p.category === selectedCategory));
    }
  }, [selectedCategory, allProducts]);

  const fetchWishlist = async () => {
    if (!session?.user?.accessToken) return;
    
    try {
      const response = await axios.get(`${API_URL}/wishlist`, {
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      });
      const items = response.data.data?.items || [];
      // Track by variationId if present (for variations), otherwise by productId (for regular products)
      const wishlistKeys = new Set<string>(
        items.map((item: any) => {
          // If item has variationId, use it (it matches the _id of expanded variation products)
          if (item.variationId) {
            return item.variationId._id || item.variationId;
          }
          // Otherwise use productId (it matches the _id of regular products)
          return item.productId._id || item.productId;
        })
      );
      setWishlistItems(wishlistKeys);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    }
  };

  const toggleWishlist = async (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user?.accessToken) {
      toast.error("Please login to add items to wishlist");
      handleProtectedAction("/login");
      return;
    }

    // Create unique key for wishlist tracking
    const wishlistKey = product._id;
    const isInWishlist = wishlistItems.has(wishlistKey);

    // Determine actual productId and variationId
    const actualProductId = product.productId || product._id; // Use productId for variations, _id for regular products
    const variationId = product.isVariation ? product._id : undefined;

    try {
      if (isInWishlist) {
        await axios.delete(`${API_URL}/wishlist/remove`, {
          data: { 
            productId: actualProductId,
            variationId: variationId 
          },
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
        });
        setWishlistItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(wishlistKey);
          return newSet;
        });
        toast.success("Removed from wishlist");
      } else {
        await axios.post(
          `${API_URL}/wishlist`,
          { 
            productId: actualProductId,
            variationId: variationId 
          },
          {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
            },
          }
        );
        setWishlistItems((prev) => new Set(prev).add(wishlistKey));
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
      setAllProducts(productsData);
      setProducts(productsData);
      
      // Extract unique categories from products
      const uniqueCategories = Array.from(new Set(productsData.map((p: Product) => p.category).filter(Boolean))) as string[];
      setCategories(["All", ...uniqueCategories]);
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

  return (
    <div className="min-h-screen bg-linear-to-b from-[#0a1628] via-[#0f1f3a] to-[#0a1628]">
      
      {/* Hero Section */}
      <section 
        className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: 'url(/pic1.png)' }}
      >
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/60 to-transparent z-10"></div>
          <img 
            src="/pic1.png" 
            alt="Business Management" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left Content */}
          <div className="text-left space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
              All-in-One Platform for Better Management
            </h1>
            <p className="text-xl text-gray-300">
              Secure, reliable, and built to support your business growth.
            </p>
            <div className="flex gap-4 pt-4">
              <Link
                href="/products"
                className="px-8 py-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Get Started
              </Link>
              <Link
                href="/about"
                className="px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white hover:text-gray-900 font-semibold rounded-lg transition-all duration-300"
              >
                Learn More
              </Link>
            </div>
          </div>

          {/* Right Content - Illustration */}
          {/*<div className="relative">
            <div className="relative bg-linear-to-br from-purple-400 to-purple-600 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-transform duration-300">
              
              <div className="bg-gray-800 rounded-2xl p-4 shadow-inner">
                <div className="bg-linear-to-br from-purple-500 to-pink-500 rounded-xl p-12 flex items-center justify-center relative overflow-hidden" style={{ minHeight: '300px' }}>
                  
                  
                  <svg className="w-48 h-48 text-yellow-400 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                  
                  
                  <div className="absolute top-4 right-4 w-12 h-12 bg-yellow-400 rounded-lg transform rotate-12 animate-bounce"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 bg-teal-400 rounded-full animate-pulse"></div>
                  <div className="absolute top-1/2 left-4 w-10 h-10 bg-orange-400 transform rotate-45"></div>
                </div>
              </div>
              
              <div className="mx-auto w-32 h-4 bg-gray-700 rounded-t-lg mt-4"></div>
              <div className="mx-auto w-48 h-2 bg-gray-800 rounded-full"></div>
            </div>
          </div>*/}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Category Tabs */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-6 ">
              Explore Our Categories
            </h2>
            <div className="flex justify-center gap-3 flex-wrap ">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-2 rounded-md font-medium transition-all duration-300 ${
                    selectedCategory === category
                      ? "bg-white text-gray-900"
                      : "bg-transparent text-gray-300 border border-gray-600 hover:bg-gray-700 hover:border-gray-400"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#1a2942] rounded-xl shadow-lg overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-700"></div>
                  <div className="p-4">
                    <div className="h-5 bg-gray-700 rounded mb-3"></div>
                    <div className="h-3 bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <div
                    key={product._id}
                    className="bg-[#1a2942] rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group"
                  >
                    <Link href={`/product/${product._id}`}>
                      <div className="relative h-48 bg-gray-700 overflow-hidden cursor-pointer">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-purple-600 to-blue-600">
                            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="p-4">
                      <Link href={`/product/${product._id}`}>
                        <h3 className="text-lg font-bold text-white mb-2 hover:text-teal-400 transition-colors cursor-pointer">
                          {product.name}
                        </h3>
                      </Link>
                      
                      {/* Star Rating */}
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className="w-4 h-4 text-yellow-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>

                      {/* Color Options */}
                      <div className="flex gap-1 mb-3">
                        <div className="h-1.5 w-1/4 bg-orange-500 rounded-full"></div>
                        <div className="h-1.5 w-1/4 bg-blue-500 rounded-full"></div>
                        <div className="h-1.5 w-1/4 bg-green-500 rounded-full"></div>
                        <div className="h-1.5 w-1/4 bg-purple-500 rounded-full"></div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xl font-bold text-white">
                            {product.hasVariations && product.lowestPrice ? (
                              <span>${product.lowestPrice.toFixed(2)}</span>
                            ) : (
                              <span>${product.price.toFixed(2)}</span>
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={product.stock === 0}
                            className="w-full px-3 py-2.5 text-sm bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all duration-300"
                          >
                            {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                          </button>
                          <button
                            onClick={() => handleOrderNow(product)}
                            disabled={product.stock === 0}
                            className="w-full px-3 py-2.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all duration-300"
                          >
                            Order Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <svg className="w-24 h-24 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-xl text-gray-400">
                No products available at the moment
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#1a2942]">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bars */}
          <div className="space-y-4 mb-12">
            <div className="h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"></div>
            <div className="h-3 bg-gray-700 rounded-full w-1/2"></div>
            <div className="h-3 bg-gray-700 rounded-full w-4/5"></div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Active Users Card */}
            <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2a4a6f] rounded-2xl p-8 shadow-xl">
              <h3 className="text-5xl font-bold text-blue-400 mb-2">500+</h3>
              <p className="text-gray-300 text-lg">Active Users</p>
            </div>

            {/* Uptime Card */}
            <div className="bg-gradient-to-br from-[#2a1e4f] to-[#3a2e5f] rounded-2xl p-8 shadow-xl">
              <h3 className="text-5xl font-bold text-purple-400 mb-2">99.9%</h3>
              <p className="text-gray-300 text-lg">Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Management Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-b from-[#0f1f3a] to-[#0a1628]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-start mb-12">
            {/* Left Side - Text Content */}
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Why Choose Management
              </h2>
              <p className="text-gray-300 mb-6">
                Empower your business with comprehensive solutions
              </p>
              <ul className="space-y-3">
                <li className="flex items-start text-gray-300">
                  <svg className="w-5 h-5 text-teal-400 mr-3 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Intuitive interface</span>
                </li>
                <li className="flex items-start text-gray-300">
                  <svg className="w-5 h-5 text-teal-400 mr-3 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Real-time inventory updates</span>
                </li>
                <li className="flex items-start text-gray-300">
                  <svg className="w-5 h-5 text-teal-400 mr-3 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Secure cloud</span>
                </li>
                <li className="flex items-start text-gray-300">
                  <svg className="w-5 h-5 text-teal-400 mr-3 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Reports that matter</span>
                </li>
              </ul>
            </div>

            {/* Right Side - Feature Boxes */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center bg-[#1a2942] p-6 rounded-xl hover:bg-[#223453] transition-colors duration-300">
                <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">Inventory</h4>
                <h4 className="text-sm font-semibold text-white">Management</h4>
              </div>
              
              <div className="text-center bg-[#1a2942] p-6 rounded-xl hover:bg-[#223453] transition-colors duration-300">
                <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">Order</h4>
                <h4 className="text-sm font-semibold text-white">Processing</h4>
              </div>
              
              <div className="text-center bg-[#1a2942] p-6 rounded-xl hover:bg-[#223453] transition-colors duration-300">
                <div className="w-16 h-16 bg-teal-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">Logistics &</h4>
                <h4 className="text-sm font-semibold text-white">Reports</h4>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/about"
              className="inline-block px-10 py-4 bg-linear-to-r from-blue-600 to-purple-600 text-white text-base font-semibold rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Learn More About Us
            </Link>
          </div>
        </div>
      </section>

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

      {/* Footer */}
      <Footer />
    </div>
  );
}
