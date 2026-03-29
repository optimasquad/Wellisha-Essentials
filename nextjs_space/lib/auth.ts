import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      profileComplete?: boolean;
    };
  }
  interface User {
    role?: string;
    profileComplete?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    profileComplete?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) {
          return null;
        }
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session: updatedSession }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.profileComplete = user.profileComplete;
      }
      // Handle session update (e.g., after profile completion)
      if (trigger === "update" && updatedSession) {
        token.profileComplete = updatedSession.user?.profileComplete ?? token.profileComplete;
        if (updatedSession.user?.name) {
          token.name = updatedSession.user.name;
        }
      }
      // Fetch latest profileComplete status from database
      if (token.id && token.profileComplete === undefined) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { profileComplete: true, role: true },
          });
          if (dbUser) {
            token.profileComplete = dbUser.profileComplete;
            token.role = dbUser.role;
          }
        } catch (error) {
          console.error("Error fetching user profile status:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session?.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.profileComplete = token.profileComplete as boolean;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
};
