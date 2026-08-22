import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { LockKeyhole } from "lucide-react";
import { signIn } from "@/auth";
import { HomeoLifeLogo } from "../ui/logo";

async function authenticate(formData: FormData) {
  "use server";

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/doctor"
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="authPage">
      <div className="authCard">
        <Link className="brand" href="/">
          <HomeoLifeLogo />
        </Link>
        <span className="authIcon">
          <LockKeyhole size={20} />
        </span>
        <h1>Doctor login</h1>
        <p>Sign in to manage appointments, content, and FAQs.</p>
        <form className="authForm" action={authenticate}>
          <label>
            Email
            <input type="email" name="email" placeholder="doctor@homeolife.sg" required autoFocus />
          </label>
          <label>
            Password
            <input type="password" name="password" placeholder="••••••••" required />
          </label>
          {error ? <p className="authError">Invalid email or password.</p> : null}
          <button className="button primary full" type="submit">
            Sign in
          </button>
        </form>
        <Link className="textLink" href="/">
          Back to site
        </Link>
      </div>
    </main>
  );
}
