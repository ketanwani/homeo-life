import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { markAppointmentPaidBySessionId } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  // Signature verification needs the raw request body -- Route Handlers don't auto-parse, so
  // request.text() gives us that untouched, unlike request.json() further down the stack.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const appointmentId = await markAppointmentPaidBySessionId(session.id);
    if (appointmentId) {
      revalidatePath("/");
      revalidatePath("/doctor");
    }
  }

  return NextResponse.json({ received: true });
}
