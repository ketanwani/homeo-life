import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// A separate, Edge-safe NextAuth instance just for route protection — see auth.config.ts for why
// this can't just import the full auth.ts (which pulls in bcrypt + pg, both Node-only).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/doctor/:path*"]
};
