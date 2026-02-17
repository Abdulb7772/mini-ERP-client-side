"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";
import Link from "next/link";
import OrderNowModal from "@/components/OrderNowModal";
import CheckoutModal from "@/components/CheckoutModal";
import ProductReviews from "@/components/ProductReviews";

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

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && params.id) {
      fetchProductDetails();
    }
  }, [status, params.id]);

  const fetchProductDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/${params.id}`);
      
      // Check if response has the expected structure
      if (!response.data || !response.data.data) {
        throw new Error("Invalid response structure");
      }
      
      const productData = response.data.data.product;
      const variationsData = response.data.data.variations || [];
      
      if (!productData) {
        throw new Error("Product not found");
      }
      
      setProduct(productData);
      setVariations(variationsData);
      
      // Select first variation by default if available
      if (variationsData.length > 0) {
        setSelectedVariation(variationsData[0]);
      }
    } catch (error: any) {
      console.error("Error fetching product details:", error.response?.data || error.message || error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    const itemToAdd = selectedVariation || product;
    console.log("Adding to cart:", itemToAdd, "Quantity:", quantity);
    alert(`Added ${quantity} x ${product?.name}${selectedVariation ? ` (${[selectedVariation.size, selectedVariation.color].filter(Boolean).join(' - ')})` : ''} to cart!`);
  };

  const handleOrderNow = () => {
    setIsOrderModalOpen(true);
  };

  const handleProceedToCheckout = (items: any[]) => {
    setCheckoutItems(items);
    setIsOrderModalOpen(false);
    setIsCheckoutModalOpen(true);
  };

  const handleOrderSuccess = () => {
    setCheckoutItems([]);
    // Refresh product details to update stock
    fetchProductDetails();
  };

  const getCurrentPrice = () => {
    if (selectedVariation) return selectedVariation.price;
    return product?.price || 0;
  };

  const getCurrentStock = () => {
    if (selectedVariation) return selectedVariation.stock;
    return product?.stock || 0;
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="animate-pulse">
              <div className="aspect-square bg-gray-700 rounded-2xl mb-4"></div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-700 rounded-lg"></div>
                ))}
              </div>
            </div>
            <div className="space-y-6 animate-pulse">
              <div className="h-10 w-3/4 bg-gray-700 rounded"></div>
              <div className="h-6 w-32 bg-gray-700 rounded"></div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-700 rounded"></div>
                <div className="h-4 w-full bg-gray-700 rounded"></div>
                <div className="h-4 w-3/4 bg-gray-700 rounded"></div>
              </div>
              <div className="h-12 w-full bg-gray-700 rounded"></div>
              <div className="h-12 w-full bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-2">Product Not Found</h2>
          <p className="text-gray-400 mb-6">The product you're looking for doesn't exist.</p>
          <Link
            href="/protected/products"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8">
          <nav className="flex text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition">
              Home
            </Link>
            <span className="mx-2 text-gray-600">/</span>
            <Link href="/protected/products" className="text-gray-400 hover:text-white transition">
              Products
            </Link>
            <span className="mx-2 text-gray-600">/</span>
            <span className="text-white">{product.name}</span>
          </nav>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-8">
            {/* Product Image */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-700 rounded-xl overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-purple-400 to-blue-500">
                    <svg className="w-32 h-32 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Additional Images */}
              {product.images && product.images.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((img, idx) => (
                    <div key={idx} className="aspect-square bg-gray-700 rounded-lg overflow-hidden">
                      <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              {/* Category Badge */}
              <div>
                <span className="inline-block px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm font-semibold uppercase">
                  {product.category}
                </span>
              </div>

              {/* Product Name */}
              <h1 className="text-4xl font-bold text-white">{product.name}</h1>

              {/* SKU */}
              <p className="text-gray-400 text-sm">SKU: {product.sku}</p>

              {/* Price */}
              <div className="flex items-center space-x-4">
                <span className="text-4xl font-bold text-blue-400">${getCurrentPrice().toFixed(2)}</span>
                {getCurrentStock() > 0 ? (
                  <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm font-semibold">
                    In Stock ({getCurrentStock()} available)
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-red-600/20 text-red-400 rounded-full text-sm font-semibold">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Variations */}
              {variations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">Select Variation</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {variations.map((variation) => (
                      <button
                        key={variation._id}
                        onClick={() => setSelectedVariation(variation)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedVariation?._id === variation._id
                            ? "border-purple-500 bg-purple-600/20"
                            : "border-gray-600 bg-gray-700 hover:border-gray-500"
                        }`}
                      >
                        <div className="text-left">
                          <p className="text-white font-semibold">
                            {[variation.size, variation.color].filter(Boolean).join(" - ") || variation.name}
                          </p>
                          <p className="text-gray-400 text-sm">${variation.price.toFixed(2)}</p>
                          <p className="text-gray-500 text-xs">Stock: {variation.stock}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Quantity</h3>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                  >
                    -
                  </button>
                  <span className="text-2xl font-semibold text-white w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(getCurrentStock(), quantity + 1))}
                    disabled={quantity >= getCurrentStock()}
                    className="w-10 h-10 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={getCurrentStock() === 0}
                  className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add to Cart
                </button>
                <button
                  onClick={handleOrderNow}
                  disabled={getCurrentStock() === 0}
                  className="flex-1 px-6 py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Order Now
                </button>
              </div>

              {/* Description */}
              <div className="pt-6 border-t border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Description</h3>
                <div className="text-gray-300 leading-relaxed">
                  {product.description ? stripHtml(product.description) : "No description available"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8">
          <ProductReviews productId={product._id} />
        </div>
      </div>

      {/* Order Now Modal */}
      {product && (
        <OrderNowModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          product={{
            _id: product._id,
            name: product.name,
            sku: product.sku,
            category: product.category,
            price: product.price,
            imageUrl: product.imageUrl,
            stock: product.stock,
            hasVariations: product.hasVariations,
          }}
          onProceedToCheckout={handleProceedToCheckout}
        />
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        cartItems={checkoutItems}
        onOrderSuccess={handleOrderSuccess}
      />
    </div>
  );
}
