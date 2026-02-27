"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { reviewAPI } from "@/services/apiService";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";
import ReviewForm from "@/components/ReviewForm";
import {Skeleton} from "@/components/Skeleton";
import { confirmToast } from "@/utils/confirmToast";

interface Review {
  _id: string;
  productId: {
    _id: string;
    name: string;
    imageUrl?: string;
  };
  orderId: {
    _id: string;
    orderNumber: string;
  };
  rating: number;
  description: string;
  images?: string[];
  status: "pending" | "approved" | "rejected";
  helpful: number;
  createdAt: string;
}

export default function MyReviewsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchReviews();
    }
  }, [status]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await reviewAPI.getMyReviews();
      setReviews(response.data.data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReview = async (reviewData: any) => {
    if (!selectedReview) return;

    try {
      await reviewAPI.updateReview(selectedReview._id, reviewData);
      toast.success("Review updated successfully");
      setShowEditModal(false);
      setSelectedReview(null);
      fetchReviews();
    } catch (error: any) {
      console.error("Error updating review:", error);
      toast.error(error.response?.data?.message || "Failed to update review");
      throw error;
    }
  };

  const handleDeleteReview = async (id: string) => {
    confirmToast({
      title: "Delete Review",
      message: "Are you sure you want to delete this review?",
      onConfirm: async () => {
        try {
          await reviewAPI.deleteReview(id);
          toast.success("Review deleted successfully");
          fetchReviews();
        } catch (error) {
          console.error("Error deleting review:", error);
          toast.error("Failed to delete review");
        }
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-600/20 text-yellow-400";
      case "approved":
        return "bg-green-600/20 text-green-400";
      case "rejected":
        return "bg-red-600/20 text-red-400";
      default:
        return "bg-gray-600/20 text-gray-400";
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? "text-yellow-500" : "text-gray-600"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-6 w-64 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Reviews</h1>
          <p className="text-gray-400">Manage all your product reviews</p>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-12 text-center">
            <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-gray-400"
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
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Reviews Yet</h2>
            <p className="text-gray-400 mb-6">
              You haven't written any reviews yet. Purchase and review products to see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review._id}
                className="bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-2xl transition border border-gray-700"
              >
                {/* Product Info */}
                <div className="flex items-start gap-4 mb-4">
                  {review.productId?.imageUrl && (
                    <img
                      src={review.productId.imageUrl}
                      alt={review.productId.name}
                      className="w-20 h-20 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {review.productId?.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Order: {review.orderId?.orderNumber}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {renderStars(review.rating)}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          review.status
                        )}`}
                      >
                        {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">
                    {formatDate(review.createdAt)}
                  </span>
                </div>

                {/* Review Content */}
                <div
                  className="prose prose-sm prose-invert max-w-none text-gray-300 mb-4"
                  dangerouslySetInnerHTML={{ __html: review.description }}
                />

                {/* Review Images */}
                {review.images && review.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {review.images.map((image, idx) => (
                      <img
                        key={idx}
                        src={image}
                        alt={`Review image ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded border border-gray-600"
                      />
                    ))}
                  </div>
                )}

                {/* Additional Info */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <span className="text-sm text-gray-400">
                    {review.helpful} people found this helpful
                  </span>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedReview(review);
                        setShowEditModal(true);
                      }}
                      className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review._id)}
                      className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Review Modal */}
        {showEditModal && selectedReview && (
          <Modal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedReview(null);
            }}
            title="Edit Review"
          >
            <ReviewForm
              orderId={selectedReview.orderId._id}
              productId={selectedReview.productId._id}
              productName={selectedReview.productId.name}
              productImage={selectedReview.productId.imageUrl}
              onSubmit={handleUpdateReview}
              onCancel={() => {
                setShowEditModal(false);
                setSelectedReview(null);
              }}
              initialData={{
                rating: selectedReview.rating,
                description: selectedReview.description,
                images: selectedReview.images,
              }}
            />
          </Modal>
        )}
      </div>
    </div>
  );
}
