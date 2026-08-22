import { Pool } from "pg";
import { appointments, contentPosts, services, testimonials } from "./seed";
import type { Appointment, ContentPost, Doctor, Service, Testimonial } from "./types";

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
    select a.id, coalesce(p.full_name, 'Patient') as patient_name, a.service_title, a.starts_at, a.status, a.notes
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
    notes: row.notes ?? undefined
  }));
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
