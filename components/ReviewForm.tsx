"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import TiptapEditor from "./TiptapEditor";
import CloudinaryUpload from "./CloudinaryUpload";
import Button from "./Button";

interface ReviewFormProps {
  orderId: string;
  productId: string;
  productName: string;
  productImage?: string;
  variationId?: string;
  onSubmit: (reviewData: any) => Promise<void>;
  onCancel?: () => void;
  initialData?: {
    rating: number;
    description: string;
    images?: string[];
  };
}

export default function ReviewForm({
  orderId,
  productId,
  productName,
  productImage,
  variationId,
  onSubmit,
  onCancel,
  initialData,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [description, setDescription] = useState(initialData?.description || "");
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!description.trim() || description.length < 10) {
      toast.error("Please write a review (at least 10 characters)");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        orderId,
        productId,
        variationId,
        rating,
        description,
        images,
      });
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <svg
              className={`w-10 h-10 ${
                star <= (hoverRating || rating)
                  ? "text-yellow-500"
                  : "text-gray-300"
              } transition-colors`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-gray-700 font-medium">
            {rating} out of 5
          </span>
        )}
      </div>
    );
  };

  const getRatingLabel = () => {
    switch (rating) {
      case 1:
        return "Poor";
      case 2:
        return "Fair";
      case 3:
        return "Good";
      case 4:
        return "Very Good";
      case 5:
        return "Excellent";
      default:
        return "Select a rating";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Info */}
      <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
        {productImage && (
          <img
            src={productImage}
            alt={productName}
            className="w-16 h-16 rounded object-cover"
          />
        )}
        <div>
          <h3 className="font-semibold text-gray-900">{productName}</h3>
          <p className="text-sm text-gray-600">Write your review for this product</p>
        </div>
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        {renderStars()}
        <p className="text-sm text-gray-600 mt-2">{getRatingLabel()}</p>
      </div>

      {/* Review Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Review <span className="text-red-500">*</span>
        </label>
        <TiptapEditor
          content={description}
          onChange={setDescription}
          placeholder="Share your experience with this product. What did you like or dislike? How was the quality?"
        />
        <p className="text-xs text-gray-500 mt-1">
          Minimum 10 characters required
        </p>
      </div>

      {/* Images Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Photos (optional)
        </label>
        <CloudinaryUpload onUpload={setImages} currentImages={images} />
        <p className="text-xs text-gray-500 mt-1">
          Help others by adding photos of your product
        </p>
      </div>

      {/* Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 flex items-start gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            Your review will be immediately visible to other customers. Please be honest and respectful in your feedback.
          </span>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            variant="secondary"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting} loading={submitting}>
          {submitting ? "Submitting..." : initialData ? "Update Review" : "Submit Review"}
        </Button>
      </div>
    </form>
  );
}
