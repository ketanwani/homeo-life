"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAppointment, getServices, setAppointmentStripeSession, SlotConflictError } from "@/lib/db";
import { getSiteUrl } from "@/lib/site";
import { getStripe } from "@/lib/stripe";

export type RequestAppointmentState = {
  ok: boolean;
  message?: string;
};

const RequestAppointmentSchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(6),
  email: z.string().trim().email().optional().or(z.literal("")),
  concern: z.string().trim().optional()
});

export async function requestAppointment(
  _prevState: RequestAppointmentState,
  formData: FormData
): Promise<RequestAppointmentState> {
  const parsed = RequestAppointmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Choose a slot and fill in your name and WhatsApp number." };
  }

  const services = await getServices();
  const service = services.find((candidate) => candidate.id === parsed.data.serviceId);
  if (!service) {
    return { ok: false, message: "Choose a valid service." };
  }

  const startsAt = new Date(`${parsed.data.date}T${parsed.data.time}:00+08:00`);
  if (Number.isNaN(startsAt.getTime()) || startsAt < new Date()) {
    return { ok: false, message: "That slot is no longer available. Pick another time." };
  }

  let appointmentId: string;
  try {
    appointmentId = await createAppointment({
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      serviceTitle: service.title,
      durationMinutes: service.durationMinutes,
      startsAt: startsAt.toISOString(),
      notes: parsed.data.concern || undefined
    });
  } catch (error) {
    if (error instanceof SlotConflictError) {
      return { ok: false, message: "That slot was just booked by someone else. Pick another time." };
    }
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/doctor");

  // The appointment row above already reserves the slot (status: scheduled, payment_status:
  // pending) -- if Stripe is unreachable here, the booking still exists for the doctor to see and
  // follow up on manually, it just won't have moved to "paid" automatically.
  const siteUrl = getSiteUrl();
  let checkoutUrl: string;
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: service.currency.toLowerCase(),
            product_data: { name: service.title },
            unit_amount: service.priceCents
          },
          quantity: 1
        }
      ],
      client_reference_id: appointmentId,
      metadata: { appointmentId },
      success_url: `${siteUrl}/booking/success?appointment=${appointmentId}`,
      cancel_url: `${siteUrl}/booking/cancelled?appointment=${appointmentId}`
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    await setAppointmentStripeSession(appointmentId, session.id);
    checkoutUrl = session.url;
  } catch (error) {
    console.error("Failed to create Stripe checkout session", error);
    return {
      ok: false,
      message:
        "Your slot is reserved, but we couldn't start payment just now. Please message us on WhatsApp to complete payment and confirm your booking."
    };
  }

  redirect(checkoutUrl);
}
