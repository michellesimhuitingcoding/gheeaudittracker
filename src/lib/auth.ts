import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticate } from "@/lib/authenticate";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials) =>
        authenticate(credentials, (email) => db.staff.findUnique({ where: { email } })),
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.staffId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.staffId = token.staffId;
      return session;
    },
  },
};
