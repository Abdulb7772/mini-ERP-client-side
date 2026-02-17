"use client";

import { useState, useEffect } from "react";
import ReviewForm from "./ReviewForm";
import { reviewAPI } from "@/services/apiService";
import toast from "react-hot-toast";

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber?: string;
  products: Array<{
    productId: string;
    productName: string;
    productImage?: string;
    variationId?: string;
  }>;
  onSuccess?: () => void;
  autoOpened?: boolean;
}

export default function OrderReviewModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  products,
  onSuccess,
  autoOpened = false,
}: OrderReviewModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [reviewableProducts, setReviewableProducts] = useState<any[]>(products);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  // Check eligibility on mount
  useEffect(() => {
    if (isOpen) {
      checkEligibility();
    }
  }, [isOpen]);

  const checkEligibility = async () => {
    try {
      setCheckingEligibility(true);
      const response = await reviewAPI.checkEligibility(orderId);
      const data = response.data;

      if (!data.canReview) {
        toast.error(data.message || "Cannot write reviews for this order");
        onClose();
        return;
      }

      // Match products with reviewable items
      const reviewable = products.filter((product) => {
        return data.data.some(
          (item: any) =>
            item.productId._id === product.productId &&
            (item.variationId || null) === (product.variationId || null)
        );
      });

      if (reviewable.length === 0) {
        toast.error("All products in this order have been reviewed");
        onClose();
        return;
      }

      setReviewableProducts(reviewable);
      setSelectedProduct(0);
    } catch (error) {
      console.error("Error checking review eligibility:", error);
      toast.error("Failed to check review eligibility");
      onClose();
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleSubmitReview = async (reviewData: any) => {
    try {
      await reviewAPI.createReview(reviewData);
      toast.success("Review submitted successfully!");

      // Remove the reviewed product from the list
      const remaining = reviewableProducts.filter((_, idx) => idx !== selectedProduct);
      
      if (remaining.length > 0) {
        setReviewableProducts(remaining);
        setSelectedProduct(0);
      } else {
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error(error.response?.data?.message || "Failed to submit review");
      throw error;
    }
  };

  const handleSkip = () => {
    onClose();
    if (onSuccess) onSuccess();
  };

  if (!isOpen) return null;

  if (checkingEligibility) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white">Checking review eligibility...</p>
        </div>
      </div>
    );
  }

  if (reviewableProducts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 pt-24">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-yellow-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-white">Rate Your Purchase</h2>
            {orderNumber && (
              <p className="text-orange-100 text-sm">Order: {orderNumber}</p>
            )}
          </div>
          <button
            onClick={handleSkip}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {autoOpened && (
            <div className="bg-blue-600/20 border border-blue-600 rounded-lg p-4">
              <div className="flex gap-3">
                <svg className="w-6 h-6 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <div className="text-sm text-blue-100">
                  <p className="font-semibold mb-1">Your Order Has Been Delivered!</p>
                  <p className="text-blue-200">
                    We'd love to hear about your experience. Your feedback helps us and other customers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Product Selector */}
          {reviewableProducts.length > 1 && (
            <div>
              <label className="block text-white font-semibold mb-2">
                Select Product to Review ({selectedProduct + 1} of {reviewableProducts.length})
              </label>
              <div className="grid grid-cols-2 gap-2">
                {reviewableProducts.map((product, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedProduct(idx)}
                    className={`p-3 border-2 rounded-lg text-left transition ${
                      selectedProduct === idx
                        ? "border-orange-500 bg-orange-500/20"
                        : "border-gray-600 bg-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {product.productImage && (
                        <img
                          src={product.productImage}
                          alt={product.productName}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <span className="text-sm font-medium text-white truncate">
                        {product.productName}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Review Form */}
          <ReviewForm
            orderId={orderId}
            productId={reviewableProducts[selectedProduct].productId}
            productName={reviewableProducts[selectedProduct].productName}
            productImage={reviewableProducts[selectedProduct].productImage}
            variationId={reviewableProducts[selectedProduct].variationId}
            onSubmit={handleSubmitReview}
            onCancel={handleSkip}
          />

          {/* Skip Button */}
          {autoOpened && (
            <div className="pt-4 border-t border-gray-700">
              <button
                onClick={handleSkip}
                className="w-full px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Skip for Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
