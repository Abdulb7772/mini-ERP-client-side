import axiosInstance from "./axios";

// Blog APIs (public)
export const blogAPI = {
  getBlogs: () => axiosInstance.get("/blogs/published"),
  getBlog: (id: string) => axiosInstance.get(`/blogs/${id}`),
};

// Employee APIs (public)
export const employeeAPI = {
  getActiveEmployees: () => axiosInstance.get("/employees/active"),
  getEmployee: (id: string) => axiosInstance.get(`/employees/${id}`),
};

// Notification APIs
export const notificationAPI = {
  getNotifications: (unreadOnly?: boolean) => 
    axiosInstance.get("/notifications", { params: { unreadOnly: unreadOnly ? "true" : "false" } }),
  markAsRead: (id: string) => axiosInstance.patch(`/notifications/${id}/read`),
  markAllAsRead: () => axiosInstance.patch("/notifications/mark-all-read"),
  deleteNotification: (id: string) => axiosInstance.delete(`/notifications/${id}`),
};

// Review APIs
export const reviewAPI = {
  getProductReviews: (productId: string, params?: any) => 
    axiosInstance.get(`/reviews/products/${productId}`, { params }),
  getMyReviews: (params?: any) => axiosInstance.get("/reviews/my-reviews", { params }),
  createReview: (data: any) => axiosInstance.post("/reviews", data),
  updateReview: (id: string, data: any) => axiosInstance.put(`/reviews/${id}`, data),
  deleteReview: (id: string) => axiosInstance.delete(`/reviews/${id}`),
  checkEligibility: (orderId: string) => axiosInstance.get(`/reviews/check-eligibility/${orderId}`),
  markHelpful: (id: string) => axiosInstance.post(`/reviews/${id}/helpful`),
};

// Complaint APIs
export const complaintAPI = {
  getMyComplaints: () => axiosInstance.get("/complaints/my-complaints"),
  getComplaint: (id: string) => axiosInstance.get(`/complaints/${id}`),
  createComplaint: (data: any) => axiosInstance.post("/complaints", data),
  canFileComplaint: (orderId: string) => axiosInstance.get(`/complaints/can-file/${orderId}`),
};

// Wallet APIs
export const walletAPI = {
  getWallet: () => axiosInstance.get("/wallet"),
  getTransactions: (params?: any) => axiosInstance.get("/wallet/transactions", { params }),
  checkBalance: (amount: number) => axiosInstance.get("/wallet/check-balance", { params: { amount } }),
};
