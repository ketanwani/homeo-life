import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const payload = await request.json();

  // Production flow:
  // 1. Store inbound message in whatsapp_threads/messages.
  // 2. Retrieve clinic FAQs, services, doctor policies, and appointment context from PostgreSQL.
  // 3. Ask the AI model for a bounded response with medical safety rules.
  // 4. Call Calendly APIs for booking/reschedule when the patient confirms.
  // 5. Escalate to the doctor when confidence is low or clinical judgment is needed.
  return NextResponse.json({
    ok: true,
    received: Boolean(payload)
  });
}
