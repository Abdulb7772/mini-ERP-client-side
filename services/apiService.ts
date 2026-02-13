import axiosInstance from "./axios";

// Blog APIs (public)
export const blogAPI = {
  getBlogs: () => axiosInstance.get("/blogs/published"),
  getBlog: (id: string) => axiosInstance.get(`/blogs/${id}`),
};
