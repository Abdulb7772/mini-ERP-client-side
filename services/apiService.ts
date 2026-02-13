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
