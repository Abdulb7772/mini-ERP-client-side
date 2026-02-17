"use client";

import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  description?: string;
  imageUrl?: string;
  stock?: number;
  hasVariations?: boolean;
  lowestPrice?: number;
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

interface OrderNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onProceedToCheckout?: (items: any[]) => void;
}

export default function OrderNowModal({ isOpen, onClose, product, onProceedToCheckout }: OrderNowModalProps) {
  const [variations, setVariations] = useState<Variation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product.hasVariations) {
      fetchVariations();
    } else {
      setVariations([]);
      setSelectedVariation(null);
    }
    setQuantity(1);
  }, [isOpen, product]);

  const fetchVariations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/products/${product._id}`);
      const variationsData = response.data.data?.variations || [];
      setVariations(variationsData);
      if (variationsData.length > 0) {
        setSelectedVariation(variationsData[0]);
      }
    } catch (error) {
      console.error("Error fetching variations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPrice = () => {
    if (selectedVariation) return selectedVariation.price;
    return product.price;
  };

  const getCurrentStock = () => {
    if (selectedVariation) return selectedVariation.stock;
    return product.stock || 0;
  };

  const handleOrderNow = () => {
    if (onProceedToCheckout) {
      // Format the item to match cart item structure for CheckoutModal
      const checkoutItem: any = {
        _id: selectedVariation?._id || product._id,
        productId: {
          _id: product._id,
          name: product.name,
          price: getCurrentPrice(),
          imageUrl: product.imageUrl,
        },
        quantity: quantity,
      };
      
      // Include variationId if a variation is selected
      if (selectedVariation) {
        checkoutItem.variationId = selectedVariation._id;
      }
      
      // Debug logging
      console.log("=== OrderNowModal Debug ===");
      console.log("Product:", product);
      console.log("Selected Variation:", selectedVariation);
      console.log("Checkout Item:", checkoutItem);
      console.log("=========================");
      
      onProceedToCheckout([checkoutItem]);
    } else {
      // Fallback if no checkout handler provided
      console.log("Ordering now:");
      alert(`Order confirmed! ${quantity} x ${product.name}${selectedVariation ? ` (${[selectedVariation.size, selectedVariation.color].filter(Boolean).join(' - ')})` : ''}\nTotal: $${(getCurrentPrice() * quantity).toFixed(2)}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Modal Content */}
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Order Now</h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Product Info */}
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-700 rounded-lg overflow-hidden shrink-0">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-purple-400 to-blue-500">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{product.name}</h3>
                    <p className="text-gray-400 text-sm mb-2">{product.category}</p>
                    <p className="text-2xl font-bold text-orange-400">${getCurrentPrice().toFixed(2)}</p>
                  </div>
                </div>

                {/* Variations */}
                {variations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-white">Select Variation</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {variations.map((variation) => (
                        <button
                          key={variation._id}
                          onClick={() => setSelectedVariation(variation)}
                          disabled={variation.stock === 0}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            selectedVariation?._id === variation._id
                              ? "border-orange-500 bg-orange-600/20"
                              : variation.stock === 0
                              ? "border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed"
                              : "border-gray-600 bg-gray-700 hover:border-gray-500"
                          }`}
                        >
                          <div className="text-left">
                            <p className="text-white font-semibold text-sm">
                              {[variation.size, variation.color].filter(Boolean).join(" - ") || variation.name}
                            </p>
                            <p className="text-gray-400 text-xs">${variation.price.toFixed(2)}</p>
                            <p className={`text-xs ${variation.stock === 0 ? 'text-red-400' : 'text-gray-500'}`}>
                              {variation.stock === 0 ? 'Out of Stock' : `Stock: ${variation.stock}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock Status */}
                {getCurrentStock() > 0 ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">In Stock ({getCurrentStock()} available)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm">Out of Stock</span>
                  </div>
                )}

                {/* Quantity Selector */}
                {getCurrentStock() > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-white">Quantity</h4>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition flex items-center justify-center font-semibold"
                      >
                        -
                      </button>
                      <span className="text-2xl font-semibold text-white w-12 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(getCurrentStock(), quantity + 1))}
                        disabled={quantity >= getCurrentStock()}
                        className="w-10 h-10 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
                      >
                        +
                      </button>
                      <span className="text-gray-400 text-sm">Max: {getCurrentStock()}</span>
                    </div>
                  </div>
                )}

                {/* Total Price */}
                {getCurrentStock() > 0 && (
                  <div className="bg-gray-900 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-gray-400">Total:</span>
                    <span className="text-3xl font-bold text-orange-400">
                      ${(getCurrentPrice() * quantity).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOrderNow}
                    disabled={getCurrentStock() === 0 || (variations.length > 0 && !selectedVariation)}
                    className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition font-semibold flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Confirm Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
