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
