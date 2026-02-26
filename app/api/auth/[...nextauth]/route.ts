import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
          console.log('🔍 [NextAuth] API_URL from env:', API_URL);
          
          // Remove /api if it exists at the end, we'll add it back consistently
          const baseUrl = API_URL.replace(/\/api\/?$/, '');
          const loginUrl = `${baseUrl}/api/auth/login`;
          
          console.log('🔍 [NextAuth] Base URL:', baseUrl);
          console.log('🔍 [NextAuth] Full login URL:', loginUrl);
          console.log('🔍 [NextAuth] Attempting login for:', credentials.email);
          
          const res = await fetch(loginUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const data = await res.json();

          if (res.ok && data.status === "success" && data.data) {
            // ⚠️ CLIENT-SIDE SECURITY: Only allow customers to login
            if (data.data.user.role !== "customer") {
              console.log('🚫 [NextAuth] Login rejected: User role is not "customer"');
              console.log('🚫 [NextAuth] Attempted role:', data.data.user.role);
              console.log('🚫 [NextAuth] User email:', data.data.user.email);
              throw new Error("Access denied. This portal is for customers only.");
            }

            console.log('✅ [NextAuth] Customer login authorized');
            return {
              id: data.data.user.id,
              email: data.data.user.email,
              name: data.data.user.name,
              role: data.data.user.role,
              token: data.data.token,
            };
          }

          throw new Error(data.message || "Invalid credentials");
        } catch (error: any) {
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-only-change-in-production",
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };
