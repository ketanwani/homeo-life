import type { NextAuthConfig } from "next-auth";

// Edge-safe config shared by auth.ts (full config, Node runtime) and middleware.ts (Edge runtime).
// Keep this file free of Node-only imports (bcrypt, pg, etc.) — middleware.ts imports it directly,
// and anything pulled in here gets bundled into the Edge middleware build.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  // We terminate TLS/host routing ourselves (Docker Compose, single container, no proxy rewriting
  // the Host header from an untrusted source), so trust whatever Host the request arrives with
  // rather than requiring AUTH_URL to be pinned to one exact domain.
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isOnDoctorArea = request.nextUrl.pathname.startsWith("/doctor");
      if (!isOnDoctorArea) return true;
      return Boolean(auth?.user);
    },
    jwt({ token, user }) {
      if (user) {
        token.doctorId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.doctorId === "string") {
        session.user.id = token.doctorId;
      }
      return session;
    }
  }
} satisfies NextAuthConfig;
