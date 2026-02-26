"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import NotificationBell from "./NotificationBell";
import axios from "@/services/axios";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch wallet balance when authenticated
  useEffect(() => {
    if (status === "authenticated") {
      fetchWalletBalance();
    }
  }, [status]);

  const fetchWalletBalance = async () => {
    try {
      const response = await axios.get("/wallet");
      if (response.data.success) {
        setWalletBalance(response.data.data.balance);
      }
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const handleProtectedAction = (path: string) => {
    if (status === "authenticated") {
      router.push(path);
    } else {
      // Save current path to redirect back after login
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  };

  // Don't show navbar on login and register pages
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <nav className="bg-white/50 backdrop-blur-md shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="shrink-0">
            <Link href="/" className="text-xl font-bold text-purple-600">
              Mini ERP
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Main Navigation Links */}
            <div className="flex items-center space-x-4">
              <Link
                href="/about"
                className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-lg font-medium transition"
              >
                About us
              </Link>
              <button
                onClick={() => handleProtectedAction("/protected/products")}
                className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-lg font-medium transition"
              >
                Products
              </button>
            </div>

            {/* Action Buttons (Search, Cart, Liked) */}
            <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
              {/* Search Button */}
              <button
                onClick={() => handleProtectedAction("/protected/search")}
                className="text-gray-700 hover:text-purple-600 p-2 rounded-md transition"
                title="Search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>

              {/* Liked (Wishlist) Button */}
              <button
                onClick={() => handleProtectedAction("/protected/wishlist")}
                className="text-gray-700 hover:text-purple-600 p-2 rounded-md transition"
                title="Wishlist"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>

              {/* Cart Button */}
              <button
                onClick={() => handleProtectedAction("/protected/cart")}
                className="text-gray-700 hover:text-purple-600 p-2 rounded-md transition relative"
                title="Cart"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </button>

              {/* Notification Bell */}
              <NotificationBell />

              {/* Live Chat Button */}
              {status === "authenticated" && (
                <button
                  onClick={() => router.push("/protected/live-chat")}
                  className="text-gray-700 hover:text-purple-600 p-2 rounded-md transition"
                  title="Live Chat"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* User Section */}
            <div className="flex items-center border-l border-gray-200 pl-4">
              {!mounted ? (
                // Show skeleton while mounting to prevent hydration mismatch
                <div className="flex items-center space-x-2">
                  <div className="h-9 w-20 bg-gray-200 animate-pulse rounded-md"></div>
                  <div className="h-9 w-20 bg-gray-200 animate-pulse rounded-md"></div>
                </div>
              ) : status === "authenticated" ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition"
                  >
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <span className="max-w-xs truncate">
                      {session?.user?.name || session?.user?.email}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isUserDropdownOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                      {/* Wallet Balance Display */}
                      <div className="px-4 py-3 border-b border-gray-200 bg-linear-to-r from-purple-50 to-blue-50">
                        <p className="text-xs text-gray-600 mb-1">Wallet Balance</p>
                        <div className="flex items-center justify-between">
                          <p className="text-2xl font-bold text-purple-600">
                            {walletBalance.toFixed(2)}
                          </p>
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">points</span>
                        </div>
                      </div>

                      <Link
                        href="/protected/wallet"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition font-medium"
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        💰 My Wallet
                      </Link>
                      <Link
                        href="/protected/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition"
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        href="/protected/orders"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition"
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        My Orders
                      </Link>
                      <Link
                        href="/protected/complaints"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition"
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        My Complaints
                      </Link>
                      <Link
                        href="/protected/change-password"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition"
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        Reset Password
                      </Link>
                      <button
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-purple-600 px-4 py-2 rounded-md text-md font-medium transition"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-purple-600 text-white px-4 py-2 rounded-md text-md font-medium hover:bg-purple-700 transition"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-purple-600 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/about"
              className="block text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-md text-base font-medium transition"
              onClick={() => setIsMenuOpen(false)}
            >
              About us
            </Link>
            <button
              onClick={() => {
                handleProtectedAction("/protected/products");
                setIsMenuOpen(false);
              }}
              className="block w-full text-left text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-md text-base font-medium transition"
            >
              Products
            </button>

            {/* Mobile Action Buttons */}
            <div className="flex items-center justify-around py-3 border-t border-b border-gray-200 my-2">
              <button
                onClick={() => {
                  handleProtectedAction("/protected/search");
                  setIsMenuOpen(false);
                }}
                className="flex flex-col items-center text-gray-700 hover:text-purple-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="text-xs mt-1">Search</span>
              </button>
              <button
                onClick={() => {
                  handleProtectedAction("/protected/wishlist");
                  setIsMenuOpen(false);
                }}
                className="flex flex-col items-center text-gray-700 hover:text-purple-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span className="text-xs mt-1">Wishlist</span>
              </button>
              <button
                onClick={() => {
                  handleProtectedAction("/protected/cart");
                  setIsMenuOpen(false);
                }}
                className="flex flex-col items-center text-gray-700 hover:text-purple-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="text-xs mt-1">Cart</span>
              </button>
              {status === "authenticated" && (
                <button
                  onClick={() => {
                    router.push("/protected/live-chat");
                    setIsMenuOpen(false);
                  }}
                  className="flex flex-col items-center text-gray-700 hover:text-purple-600"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <span className="text-xs mt-1">Live Chat</span>
                </button>
              )}
            </div>

            {/* Mobile User Section */}
            {!mounted ? (
              // Show skeleton while mounting
              <div className="pt-2 border-t border-gray-200 px-3 py-2">
                <div className="h-10 bg-gray-200 animate-pulse rounded-md mb-2"></div>
                <div className="h-10 bg-gray-200 animate-pulse rounded-md"></div>
              </div>
            ) : status === "authenticated" ? (
              <div className="pt-2 border-t border-gray-200">
                <div className="px-3 py-2">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session?.user?.name || session?.user?.email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {session?.user?.email}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/protected/profile"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-md transition mb-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/protected/orders"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-md transition mb-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Orders
                  </Link>
                  <Link
                    href="/protected/complaints"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-md transition mb-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Complaints
                  </Link>
                  <Link
                    href="/protected/change-password"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-md transition mb-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Reset Password
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-gray-200">
                <Link
                  href="/login"
                  className="block text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-md text-base font-medium transition"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="block text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-md text-base font-medium transition"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
