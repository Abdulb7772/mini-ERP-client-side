"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import Input from "@/components/Input";
import Button from "@/components/Button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user was logged out due to inactivity
    if (searchParams.get("session") === "expired") {
      toast.error("You were logged out due to inactivity");
    }
  }, [searchParams]);

  const validationSchema = Yup.object({
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    password: Yup.string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
  });

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const result = await signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false,
        });

        console.log('Login result:', result);

        if (result?.error) {
          // Check if error is about email verification
          if (result.error.includes("verify") || result.error.includes("Verify")) {
            toast.error("Please verify your email before logging in. Check your inbox for the verification link.");
          } else {
            toast.error(result.error || "Invalid email or password");
          }
          setLoading(false);
        } else if (result?.ok) {
          toast.success("Login successful!");
          
          // Get callback URL or default to home page
          const callbackUrl = searchParams.get("callbackUrl") || "/";
          
          // Add delay to show toast before redirect
          setTimeout(() => {
            window.location.href = callbackUrl;
          }, 1000);
        } else {
          toast.error("Login failed. Please try again.");
          setLoading(false);
        }
      } catch (error) {
        console.error('Login error:', error);
        toast.error("An error occurred during login");
        setLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-600 via-indigo-600 to-violet-500 flex items-center justify-center px-6 py-10">
      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-280 bg-white rounded-3xl shadow-2xl grid grid-cols-1 md:grid-cols-2 overflow-hidden"
      >
        {/* LEFT – Illustration */}
        <div className="hidden md:flex max-w-300 items-center justify-center bg-linear-to-br from-purple-100 to-indigo-100 p-0 relative">
          {/* Back to Home Button */}
          <Link
            href="/"
            className="absolute top-4 left-4 inline-flex items-center text-sm text-white hover:text-gray-200 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition z-10"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
          <Image
            src="/p1.png"
            alt="Login Illustration"
            width={800}
            height={800}
            className="object-cover w-full h-full"
            priority
          />
        </div>

        {/* RIGHT – Form */}
        <div className="w-full flex items-center justify-center p-8">
          <div className="bg-purple-500 rounded-3xl shadow-2xl p-8 w-full max-w-md text-white">
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full max-w-sm space-y-6"
            >
              {/* Header */}
              <div className="space-y-1 mb-2 text-center">
                <h2 className="text-3xl font-bold text-white">
                  Welcome Back
                </h2>
                <p className="text-sm text-white">
                  Sign in to access Mini ERP
                </p>
              </div>

              {/* Form */}
              <form onSubmit={formik.handleSubmit} className="space-y-4 mb-1 text-white">
                <Input
                  label="Email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  name="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.email && formik.errors.email ? formik.errors.email : undefined}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  name="password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.password && formik.errors.password ? formik.errors.password : undefined}
                />

                <Button
                  type="submit"
                  loading={loading}
                  className="w-full mt-2 rounded-xl py-3 font-semibold bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition"
                >
                  Sign in
                </Button>
              </form>

              {/* Footer */}
              <p className="text-center text-sm text-gray-200 mb-4">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-blue-900 hover:text-indigo-700"
                >
                  Create Account
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-br from-purple-600 via-indigo-600 to-violet-500 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
