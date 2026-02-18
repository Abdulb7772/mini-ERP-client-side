"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { complaintAPI } from "@/services/apiService";
import toast from "react-hot-toast";
import Link from "next/link";

interface Complaint {
  _id: string;
  orderId: {
    _id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
  };
  subject: string;
  description: string;
  status: "pending" | "in-review" | "resolved" | "rejected";
  priority: "low" | "medium" | "high";
  attachments?: string[];
  response?: string;
  respondedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ComplaintsPage() {
  const { data: session } = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Fix Cloudinary URLs for non-image files (PDFs, etc.)
  const getProperCloudinaryUrl = (url: string) => {
    // Check if it's a PDF or non-image file in image/upload path
    const isPDF = /\.pdf$/i.test(url);
    const isDoc = /\.(doc|docx|txt|zip|rar)$/i.test(url);
    
    if ((isPDF || isDoc) && url.includes('/image/upload/')) {
      // Replace /image/upload/ with /raw/upload/ for PDFs and documents
      url = url.replace('/image/upload/', '/raw/upload/');
    }
    
    // For ALL /raw/upload/ files (PDFs, documents), use proxy endpoint
    // This handles files even when they don't have .pdf extension in URL
    if (url.includes('/raw/upload/')) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      return `${apiUrl}/file-proxy?url=${encodeURIComponent(url)}`;
    }
    
    return url;
  };

  useEffect(() => {
    if (session?.user?.accessToken) {
      fetchComplaints();
    }
  }, [session]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await complaintAPI.getMyComplaints();
      setComplaints(response.data.data || []);
    } catch (error: any) {
      console.error("Error fetching complaints:", error);
      toast.error(error.response?.data?.message || "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "in-review":
        return "bg-blue-100 text-blue-800 border border-blue-300";
      case "resolved":
        return "bg-green-100 text-green-800 border border-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 border border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border border-red-300";
      case "medium":
        return "bg-orange-100 text-orange-800 border border-orange-300";
      case "low":
        return "bg-gray-100 text-gray-800 border border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Complaints</h1>
          <p className="text-gray-600">View and track all your complaints</p>
        </div>

        {/* Complaints List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <svg
              className="w-24 h-24 mx-auto text-gray-400 mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Complaints Yet</h3>
            <p className="text-gray-600 mb-6">
              You haven't filed any complaints. If you have issues with an order, you can file a complaint from your order details page.
            </p>
            <Link
              href="/protected/orders"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              View My Orders
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {complaints.map((complaint) => (
              <div
                key={complaint._id}
                className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4"
                style={{
                  borderLeftColor:
                    complaint.priority === "high"
                      ? "#EF4444"
                      : complaint.priority === "medium"
                      ? "#F97316"
                      : "#9CA3AF",
                }}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {complaint.subject}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          Order #{complaint.orderId.orderNumber}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(complaint.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 sm:mt-0">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(
                          complaint.priority
                        )}`}
                      >
                        {complaint.priority.toUpperCase()}
                      </span>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          complaint.status
                        )}`}
                      >
                        {complaint.status.toUpperCase().replace("-", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Description Preview */}
                  <div
                    className="text-gray-700 mb-4 line-clamp-2 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: complaint.description }}
                  />

                  {/* Response Indicator */}
                  {complaint.response && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Response received from support team</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      Order Total: <span className="font-semibold text-gray-900">${complaint.orderId.totalAmount.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => handleViewComplaint(complaint)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between rounded-t-2xl sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-bold text-white">Complaint Details</h2>
                <p className="text-purple-100 text-sm">Order #{selectedComplaint.orderId.orderNumber}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Complaint Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span
                    className={`inline-block mt-1 px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      selectedComplaint.status
                    )}`}
                  >
                    {selectedComplaint.status.toUpperCase().replace("-", " ")}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Priority</label>
                  <span
                    className={`inline-block mt-1 px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(
                      selectedComplaint.priority
                    )}`}
                  >
                    {selectedComplaint.priority.toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-gray-900 mt-1">{formatDate(selectedComplaint.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Order Total</label>
                  <p className="text-gray-900 mt-1 font-semibold">
                    ${selectedComplaint.orderId.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">Subject</label>
                <p className="text-gray-900 text-lg font-semibold">{selectedComplaint.subject}</p>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">Description</label>
                <div
                  className="text-gray-900 prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: selectedComplaint.description }}
                />
              </div>

              {/* Attachments */}
              {selectedComplaint.attachments && selectedComplaint.attachments.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">
                    Attachments ({selectedComplaint.attachments.length})
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedComplaint.attachments.map((url, idx) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
                      const isPDF = /\.pdf$/i.test(url);
                      const fileExtension = url.split('.').pop()?.toUpperCase() || 'FILE';
                      const properUrl = getProperCloudinaryUrl(url);
                      
                      return (
                        <div key={idx} className="block">
                          {isImage ? (
                            <a
                              href={properUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={properUrl}
                                alt={`Attachment ${idx + 1}`}
                                className="w-full h-32 object-cover rounded-lg border-2 border-gray-300 hover:border-purple-500 transition"
                              />
                            </a>
                          ) : (
                            <a
                              href={properUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-300 hover:border-purple-500 transition flex flex-col items-center justify-center p-3 group"
                            >
                              {isPDF ? (
                                <svg
                                  className="w-12 h-12 text-red-500 group-hover:text-red-600"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                                  <path d="M14 2v6h6" fill="none" stroke="white" strokeWidth="2"/>
                                  <text x="8" y="17" fontSize="6" fill="white" fontWeight="bold">PDF</text>
                                </svg>
                              ) : (
                                <svg
                                  className="w-10 h-10 text-gray-400 group-hover:text-gray-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                  />
                                </svg>
                              )}
                              <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 mt-2 text-center">
                                {fileExtension}
                              </span>
                              <span className="text-xs text-gray-500 mt-1">
                                {isPDF ? 'Click to view' : 'Click to open'}
                              </span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Admin Response */}
              {selectedComplaint.response ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-green-900 font-bold text-sm">
                          Response from {selectedComplaint.respondedBy?.name || "Support Team"}
                        </p>
                        {selectedComplaint.respondedAt && (
                          <span className="text-xs text-green-700">
                            {formatDate(selectedComplaint.respondedAt)}
                          </span>
                        )}
                      </div>
                      <div
                        className="text-gray-800 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedComplaint.response }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <svg className="w-12 h-12 mx-auto text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-blue-900 font-medium">Awaiting Response</p>
                  <p className="text-blue-700 text-sm mt-1">
                    Our support team is reviewing your complaint and will respond soon.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Link
                  href={`/protected/order-success?orderId=${selectedComplaint.orderId._id}`}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                  onClick={() => setShowModal(false)}
                >
                  View Order
                </Link>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
