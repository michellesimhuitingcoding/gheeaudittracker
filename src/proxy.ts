import { withAuth } from "next-auth/middleware";

// Send logged-out visitors to /login. Pages still check on the server.
export default withAuth({ pages: { signIn: "/login" } });

export const config = {
  matcher: ["/((?!api/auth|api/cron|login|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
