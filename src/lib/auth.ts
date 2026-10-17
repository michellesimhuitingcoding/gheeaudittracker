import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { recordAudit } from "@/lib/audit";
import { authenticate, normaliseEmail } from "@/lib/authenticate";
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
      async authorize(credentials) {
        const staff = await authenticate(credentials, (email) =>
          db.staff.findUnique({ where: { email } }),
        );
        if (staff) {
          await recordAudit(db, { action: "LOGIN_SUCCEEDED", actorId: staff.id, entityType: "Staff", entityId: staff.id });
        } else {
          const attempted = typeof credentials?.email === "string" ? normaliseEmail(credentials.email) : "";
          await recordAudit(db, { action: "LOGIN_FAILED", detail: attempted.slice(0, 200) });
        }
        return staff;
      },
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
