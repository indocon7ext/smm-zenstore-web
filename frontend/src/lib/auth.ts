import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../lib/prisma";

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: string;
      balance: number;
      isActive: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image?: string;
    role: string;
    balance: number;
    isActive: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    balance: number;
    isActive: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  // Temporarily disable adapter until database is properly configured
  // adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For now, allow all Google sign-ins without database operations
      if (account?.provider === "google") {
        console.log(`User ${user.email} signing in via Google`);
        return true;
      }
      return true;
    },
    async session({ session, token }) {
      // Add user data to session from JWT token
      if (session.user && token) {
        session.user.id = token.sub || '';
        session.user.role = token.role || 'CUSTOMER';
        session.user.balance = token.balance || 0;
        session.user.isActive = token.isActive || true;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || 'CUSTOMER';
        token.balance = user.balance || 0;
        token.isActive = user.isActive || true;
      }
      return token;
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User ${user.email} signed in via ${account?.provider}`);
      if (isNewUser) {
        console.log(`New user created: ${user.email}`);
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
};
