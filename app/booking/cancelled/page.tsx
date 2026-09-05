import Link from "next/link";
import { XCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/site";
import { HomeoLifeLogo } from "../../ui/logo";

export default function BookingCancelledPage() {
  const whatsAppUrl = getWhatsAppUrl(
    "Hi Homeo Life, I started booking an appointment but payment didn't go through. Can you help?"
  );

  return (
    <main className="authPage">
      <div className="authCard">
        <Link className="brand" href="/">
          <HomeoLifeLogo />
        </Link>
        <span className="authIcon">
          <XCircle size={20} />
        </span>
        <h1>Payment not completed</h1>
        <p>
          Your slot is held but not yet confirmed. You can book again to retry payment, or message
          us on WhatsApp and we&apos;ll help you complete it.
        </p>
        <Link className="button primary full" href="/#book">
          Try again
        </Link>
        <a className="button secondary full" href={whatsAppUrl}>
          Ask on WhatsApp
        </a>
      </div>
    </main>
  );
}
