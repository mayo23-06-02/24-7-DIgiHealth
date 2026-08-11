import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import type { NextAuthConfig } from "next-auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";

export default {
  providers: [
    Google({
      allowDangerousEmailAccountLinking: false,
    }),
    Facebook({
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !user.email) return false;

      try {
        await connectToDatabase();

        const existingUser = await User.findOne({ email: user.email.toLowerCase() });

        if (existingUser) {
          if (!existingUser.emailVerified) {
            return false;
          }
          user.id = existingUser._id.toString();
        } else {
          return false;
        }

        return true;
      } catch (error) {
        console.error("[OAuth signIn callback]", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        try {
          await connectToDatabase();
          const dbUser = await User.findById(user.id);
          token.role = dbUser?.role || "patient";
        } catch {
          token.role = "patient";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
