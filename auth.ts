import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { getDoctorByEmail } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const doctor = await getDoctorByEmail(email);
        if (!doctor) return null;

        const isValidPassword = await bcrypt.compare(password, doctor.passwordHash);
        if (!isValidPassword) return null;

        return { id: doctor.id, email: doctor.email, name: doctor.fullName };
      }
    })
  ]
});
