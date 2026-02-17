"use client";

import { useState } from "react";
import OrderReviewModal from "./OrderReviewModal";
import toast from "react-hot-toast";

interface OrderReviewButtonProps {
  orderId: string;
  orderNumber?: string;
  products: Array<{
    productId: string;
    productName: string;
    productImage?: string;
    variationId?: string;
  }>;
  onSuccess?: () => void;
}

export default function OrderReviewButton({
  orderId,
  orderNumber,
  products,
  onSuccess,
}: OrderReviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpen = () => {
    setLoading(true);
    setIsOpen(true);
    setLoading(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSuccess = () => {
    setIsOpen(false);
    if (onSuccess) onSuccess();
  };

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={loading}
        className="flex-1 px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition text-center flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Checking...
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            Write Review
          </>
        )}
      </button>

      <OrderReviewModal
        isOpen={isOpen}
        onClose={handleClose}
        orderId={orderId}
        orderNumber={orderNumber}
        products={products}
        onSuccess={handleSuccess}
        autoOpened={false}
      />
    </>
  );
}
