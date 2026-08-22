"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAppointment, getServices, SlotConflictError } from "@/lib/db";

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

  try {
    await createAppointment({
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

  return {
    ok: true,
    message: "Your appointment request is in. We'll confirm the details by WhatsApp or email shortly."
  };
}
