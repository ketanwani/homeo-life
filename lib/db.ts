import { Pool } from "pg";
import { appointments, availability, contentPosts, services, testimonials } from "./seed";
import type { Appointment, ContentPost, DayAvailability, Doctor, Service, Testimonial } from "./types";

let pool: Pool | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function getServices(): Promise<Service[]> {
  const client = getPool();
  if (!client) return services;

  const result = await client.query(`
    select id, title, description, duration_minutes, price_cents, currency, calendly_event_type_url, is_featured
    from services
    order by is_featured desc, title asc
  `);

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    durationMinutes: row.duration_minutes,
    priceCents: row.price_cents,
    currency: row.currency,
    calendlyEventTypeUrl: row.calendly_event_type_url ?? undefined,
    isFeatured: row.is_featured
  }));
}

export type NewServiceInput = {
  title: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  isFeatured: boolean;
};

// Returns the new service's id so the caller can attach an uploaded image to it (see
// lib/service-image.ts, which matches image filenames against this id).
export async function createService(input: NewServiceInput): Promise<string> {
  const client = getPool();
  if (!client) {
    const id = `local-service-${services.length + 1}`;
    services.push({ id, ...input });
    return id;
  }

  const result = await client.query(
    `insert into services (title, description, duration_minutes, price_cents, currency, is_featured)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [input.title, input.description, input.durationMinutes, input.priceCents, input.currency, input.isFeatured]
  );
  return result.rows[0].id;
}

export async function updateService(id: string, input: NewServiceInput): Promise<void> {
  const client = getPool();
  if (!client) {
    const index = services.findIndex((existing) => existing.id === id);
    if (index !== -1) services[index] = { ...services[index], ...input };
    return;
  }

  await client.query(
    `update services
     set title = $2, description = $3, duration_minutes = $4, price_cents = $5, currency = $6, is_featured = $7
     where id = $1`,
    [id, input.title, input.description, input.durationMinutes, input.priceCents, input.currency, input.isFeatured]
  );
}

// service_title on appointments is a denormalized text snapshot, not a foreign key (see
// createAppointment above), so deleting a service here can never fail on a referential constraint --
// past bookings just keep their original title text.
export async function deleteService(id: string): Promise<void> {
  const client = getPool();
  if (!client) {
    const index = services.findIndex((existing) => existing.id === id);
    if (index !== -1) services.splice(index, 1);
    return;
  }

  await client.query(`delete from services where id = $1`, [id]);
}

export async function getPublishedPosts(type?: ContentPost["type"]): Promise<ContentPost[]> {
  const client = getPool();
  if (!client) {
    return contentPosts.filter((post) => post.status === "published" && (!type || post.type === type));
  }

  const params = type ? [type] : [];
  const result = await client.query(
    `
      select id, slug, type, title, excerpt, body, cover_image_url, video_url, status, published_at
      from content_posts
      where status = 'published' ${type ? "and type = $1" : ""}
      order by published_at desc nulls last, created_at desc
    `,
    params
  );

  return result.rows.map(mapPost);
}

export async function getFaqs(): Promise<ContentPost[]> {
  const client = getPool();
  if (!client) return contentPosts.filter((post) => post.type === "faq");

  const result = await client.query(`
    select id, slug, type, title, excerpt, body, cover_image_url, video_url, status, published_at
    from content_posts
    where type = 'faq' and status != 'archived'
    order by created_at asc
  `);

  return result.rows.map(mapPost);
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const client = getPool();
  if (!client) return testimonials;

  const result = await client.query(`
    select id, patient_name, condition_label, rating, quote
    from testimonials
    where status = 'published'
    order by created_at desc
  `);

  return result.rows.map((row) => ({
    id: row.id,
    patientName: row.patient_name,
    conditionLabel: row.condition_label ?? "Patient care",
    rating: row.rating,
    quote: row.quote
  }));
}

export async function getAppointments(): Promise<Appointment[]> {
  const client = getPool();
  if (!client) return appointments;

  const result = await client.query(`
    select a.id, coalesce(p.full_name, 'Patient') as patient_name, a.service_title, a.starts_at, a.status, a.payment_status, a.notes
    from appointments a
    left join patients p on p.id = a.patient_id
    order by a.starts_at asc
    limit 20
  `);

  return result.rows.map((row) => ({
    id: row.id,
    patientName: row.patient_name,
    serviceTitle: row.service_title,
    startsAt: row.starts_at.toISOString(),
    status: row.status,
    paymentStatus: row.payment_status,
    notes: row.notes ?? undefined
  }));
}

export type NewAppointmentInput = {
  fullName: string;
  phone: string;
  email?: string;
  serviceTitle: string;
  durationMinutes: number;
  startsAt: string; // ISO
  notes?: string;
};

export class SlotConflictError extends Error {}

// Returns the new appointment's id so the caller can create a Stripe Checkout Session against it
// and record that session's id back onto the row (see setAppointmentStripeSession below).
export async function createAppointment(input: NewAppointmentInput): Promise<string> {
  const client = getPool();
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60_000);

  if (!client) {
    const conflict = appointments.some((existing) => {
      if (existing.status === "canceled") return false;
      const otherStart = new Date(existing.startsAt);
      const otherEnd = new Date(otherStart.getTime() + 60 * 60_000); // fallback mode has no per-appointment duration
      return startsAt < otherEnd && otherStart < endsAt;
    });
    if (conflict) throw new SlotConflictError("Slot already booked");

    const id = `local-${appointments.length + 1}`;
    appointments.push({
      id,
      patientName: input.fullName,
      serviceTitle: input.serviceTitle,
      startsAt: startsAt.toISOString(),
      status: "scheduled",
      paymentStatus: "pending",
      notes: input.notes
    });
    return id;
  }

  const pgClient = await client.connect();
  try {
    await pgClient.query("begin");

    // Overlap check looks up each *existing* appointment's own duration via its service_title
    // (defaulting to 60min for anything that doesn't match a known service) -- appointments.
    // service_title is a denormalized text snapshot, not a foreign key, matching the schema as-is.
    const conflictResult = await pgClient.query(
      `select 1
       from appointments a
       left join services s on s.title = a.service_title
       where a.status in ('scheduled', 'rescheduled')
         and a.starts_at < $2
         and (a.starts_at + (coalesce(s.duration_minutes, 60) || ' minutes')::interval) > $1
       limit 1`,
      [startsAt.toISOString(), endsAt.toISOString()]
    );

    if ((conflictResult.rowCount ?? 0) > 0) {
      throw new SlotConflictError("Slot already booked");
    }

    const patientResult = await pgClient.query(
      `insert into patients (full_name, email, phone) values ($1, $2, $3) returning id`,
      [input.fullName, input.email ?? null, input.phone]
    );
    const patientId = patientResult.rows[0].id;

    const appointmentResult = await pgClient.query(
      `insert into appointments (patient_id, service_title, starts_at, status, payment_status, notes)
       values ($1, $2, $3, 'scheduled', 'pending', $4)
       returning id`,
      [patientId, input.serviceTitle, startsAt.toISOString(), input.notes ?? null]
    );

    await pgClient.query("commit");
    return appointmentResult.rows[0].id;
  } catch (error) {
    await pgClient.query("rollback").catch(() => {});
    throw error;
  } finally {
    pgClient.release();
  }
}

// Called right after createAppointment() once the Stripe Checkout Session exists, so the webhook
// can look the appointment back up by session id when payment completes.
export async function setAppointmentStripeSession(appointmentId: string, sessionId: string): Promise<void> {
  const client = getPool();
  if (!client) return; // in-memory fallback has no session-id field; nothing to look up later either

  await client.query(`update appointments set stripe_checkout_session_id = $2 where id = $1`, [
    appointmentId,
    sessionId
  ]);
}

// Called from the Stripe webhook on checkout.session.completed. Returns the appointment id that was
// updated (or null if no appointment matched, e.g. a stale/replayed webhook) so the caller can revalidate.
export async function markAppointmentPaidBySessionId(sessionId: string): Promise<string | null> {
  const client = getPool();
  if (!client) return null;

  const result = await client.query(
    `update appointments set payment_status = 'paid' where stripe_checkout_session_id = $1 returning id`,
    [sessionId]
  );
  return result.rows[0]?.id ?? null;
}

export async function getAvailability(): Promise<DayAvailability[]> {
  const client = getPool();
  if (!client) return availability;

  const result = await client.query(
    `select weekday, is_available, start_time, end_time from doctor_availability order by weekday asc`
  );

  return result.rows.map((row) => ({
    weekday: row.weekday,
    isAvailable: row.is_available,
    startTime: row.start_time ? String(row.start_time).slice(0, 5) : undefined,
    endTime: row.end_time ? String(row.end_time).slice(0, 5) : undefined
  }));
}

export async function setAvailability(days: DayAvailability[]): Promise<void> {
  const client = getPool();
  if (!client) {
    for (const day of days) {
      const index = availability.findIndex((existing) => existing.weekday === day.weekday);
      if (index !== -1) availability[index] = day;
    }
    return;
  }

  for (const day of days) {
    await client.query(
      `update doctor_availability
       set is_available = $2, start_time = $3, end_time = $4, updated_at = now()
       where weekday = $1`,
      [day.weekday, day.isAvailable, day.isAvailable ? day.startTime : null, day.isAvailable ? day.endTime : null]
    );
  }
}

// There is only ever one doctor account today, so when DATABASE_URL isn't set (local dev without
// Postgres, or Docker Compose not yet up) we fall back to a single account described by env vars
// instead of a full in-memory table. Run `npm run hash-password -- <password>` to produce
// DOCTOR_PASSWORD_HASH. Once a `doctors` row is created via `npm run create-doctor`, the real
// Postgres path below takes over automatically.
export async function getDoctorByEmail(email: string): Promise<Doctor | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const client = getPool();

  if (!client) {
    const fallbackEmail = process.env.DOCTOR_EMAIL?.trim().toLowerCase();
    const fallbackHash = process.env.DOCTOR_PASSWORD_HASH;
    if (!fallbackEmail || !fallbackHash || fallbackEmail !== normalizedEmail) return null;

    return {
      id: "env-doctor",
      email: fallbackEmail,
      fullName: process.env.DOCTOR_NAME || "Dr. Neha Mehta",
      passwordHash: fallbackHash
    };
  }

  const result = await client.query(
    `select id, email, full_name, password_hash from doctors where email = $1 limit 1`,
    [normalizedEmail]
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    passwordHash: row.password_hash
  };
}

function mapPost(row: Record<string, any>): ContentPost {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    coverImageUrl: row.cover_image_url ?? undefined,
    videoUrl: row.video_url ?? undefined,
    status: row.status,
    publishedAt: row.published_at?.toISOString?.() ?? undefined
  };
}
