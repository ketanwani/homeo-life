import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { HomeoLifeLogo } from "../../ui/logo";

export default function BookingSuccessPage() {
  return (
    <main className="authPage">
      <div className="authCard">
        <Link className="brand" href="/">
          <HomeoLifeLogo />
        </Link>
        <span className="authIcon">
          <CheckCircle2 size={20} />
        </span>
        <h1>Payment received</h1>
        <p>
          Your appointment is confirmed. We&apos;ll be in touch by WhatsApp or email with anything
          you need before your visit.
        </p>
        <Link className="button primary full" href="/">
          Back to homepage
        </Link>
      </div>
    </main>
  );
}
