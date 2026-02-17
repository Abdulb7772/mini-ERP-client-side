"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { blogAPI } from "@/services/apiService";
import Footer from "@/components/Footer";

interface Blog {
  _id: string;
  title: string;
  description: string;
  imageUrl?: string;
  author: string;
  status: "published" | "blocked";
  createdAt: string;
  updatedAt: string;
}

export default function BlogsPage() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [imageFilter, setImageFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewBlog, setViewBlog] = useState<Blog | null>(null);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const response = await blogAPI.getBlogs();
      setBlogs(response.data);
    } catch (error) {
      console.error("Error fetching blogs:", error);
      toast.error("Failed to fetch blogs");
    } finally {
      setLoading(false);
    }
  };

  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch =
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesImage =
      imageFilter === "all" ||
      (imageFilter === "with-image" && blog.imageUrl) ||
      (imageFilter === "without-image" && !blog.imageUrl);
    return matchesSearch && matchesImage;
  });

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // Pagination
  const totalPages = Math.ceil(filteredBlogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBlogs = filteredBlogs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, imageFilter]);

  const handleItemsPerPageChange = (value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num > 0 && num <= 500) {
      setItemsPerPage(num);
    }
  };

  return (
    <>
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 ">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
          <p className="text-gray-600 mt-1">Manage your blog posts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Picture
            </label>
            <select
              value={imageFilter}
              onChange={(e) => setImageFilter(e.target.value)}
              className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Blogs</option>
              <option value="with-image">With Picture</option>
              <option value="without-image">Without Picture</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="mb-6">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Loading blogs...</p>
          </div>
        ) : paginatedBlogs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-600">
            No blogs found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedBlogs.map((blog) => (
              blog.imageUrl ? (
                // Flip Card for blogs WITH images
                <div
                  key={blog._id}
                  className="group h-96 perspective-[1000px]"
                >
                  <div className="relative h-full w-full transition-all duration-1000 delay-200 transform-3d group-hover:rotate-y-180">
                    {/* Front Side - Image */}
                    <div className="absolute inset-0 h-full w-full rounded-xl backface-hidden">
                      <div className="h-full w-full bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="relative h-full">
                          <img
                            src={blog.imageUrl}
                            alt={blog.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4">
                            <h3 className="text-xl font-bold text-white mb-1">{blog.title}</h3>
                            <p className="text-sm text-gray-200">By {blog.author}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Back Side - Description & Button */}
                    <div className="absolute inset-0 h-full w-full rounded-xl bg-linear-to-br from-purple-600 to-indigo-600 px-6 py-8 text-white transform-[rotateY(180deg)] backface-hidden shadow-lg">
                      <div className="flex flex-col h-full">
                        <h3 className="text-xl font-bold mb-3">{blog.title}</h3>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm text-white/90 mb-2">
                            <strong>By:</strong> {blog.author}
                          </p>
                          <p className="text-sm text-white/90 mb-3">
                            <strong>Date:</strong> {new Date(blog.createdAt).toLocaleDateString()}
                          </p>
                          <div className="text-sm text-white/90 line-clamp-6">
                            {stripHtml(blog.description)}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setViewBlog(blog);
                            setViewModalOpen(true);
                          }}
                          className="mt-4 w-full bg-white text-purple-600 font-semibold py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors shadow-md"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Static Card for blogs WITHOUT images
                <div
                  key={blog._id}
                  className="h-96"
                >
                  <div 
                    className="h-full w-full rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
                    style={{
                      background: [
                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
                        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                        'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)'
                      ][filteredBlogs.indexOf(blog) % 10]
                    }}
                  >
                    <div className="flex flex-col h-full p-6">
                      <div className="flex-1 overflow-hidden">
                        <div className="inline-block p-2 bg-white/20 rounded-lg mb-3 backdrop-blur-sm">
                          <span className="text-2xl">📝</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 drop-shadow-md">{blog.title}</h3>
                        <p className="text-sm text-white/90 mb-2">
                          <strong>By:</strong> {blog.author}
                        </p>
                        <p className="text-sm text-white/90 mb-4">
                          <strong>Date:</strong> {new Date(blog.createdAt).toLocaleDateString()}
                        </p>
                        <div className="text-sm text-white/90 line-clamp-8 leading-relaxed">
                          {stripHtml(blog.description)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setViewBlog(blog);
                          setViewModalOpen(true);
                        }}
                        className="mt-4 w-full bg-white text-purple-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-all shadow-md hover:shadow-lg"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredBlogs.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredBlogs.length)} of {filteredBlogs.length} blogs
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-600">Show</span>
              <input
                type="number"
                min="1"
                max="500"
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(e.target.value)}
                className="w-16 px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-600">per page</span>
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 border rounded-md text-sm font-medium ${
                  currentPage === page
                    ? "bg-purple-600 text-white border-purple-600"
                    : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      
      {/* View Blog Modal */}
      {viewModalOpen && viewBlog && (
        <div className="fixed inset-0 z-50 overflow-y-auto pt-20">
          <div className="flex items-start justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 backdrop-blur-sm bg-black/30 transition-opacity"
              onClick={() => {
                setViewModalOpen(false);
                setViewBlog(null);
              }}
            ></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-4xl">
              <div className="bg-purple-500 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{viewBlog.title}</h3>
                  <button
                    onClick={() => {
                      setViewModalOpen(false);
                      setViewBlog(null);
                    }}
                    className="text-white hover:text-gray-200"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="bg-white px-6 py-6 max-h-[70vh] overflow-y-auto">
                {viewBlog.imageUrl && (
                  <div className="mb-6">
                    <img
                      src={viewBlog.imageUrl}
                      alt={viewBlog.title}
                      className="w-full max-h-80 object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>By <strong className="text-gray-700">{viewBlog.author}</strong></span>
                    <span>•</span>
                    <span>{new Date(viewBlog.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: viewBlog.description }}
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button
                  onClick={() => {
                    setViewModalOpen(false);
                    setViewBlog(null);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    <Footer />
    </>
  );
}
