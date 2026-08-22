import { NextResponse } from "next/server";
import { z } from "zod";

const calendlyWebhookSchema = z.object({
  event: z.enum(["invitee.created", "invitee.canceled", "routing_form_submission.created"]),
  payload: z.record(z.any())
});

export async function POST(request: Request) {
  const body = calendlyWebhookSchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Invalid Calendly webhook payload" }, { status: 400 });
  }

  // Persist to appointments in PostgreSQL after verifying Calendly signatures.
  // For reschedules, Calendly sends cancellation plus a newly-created invitee event.
  return NextResponse.json({
    ok: true,
    handled: body.data.event
  });
}
