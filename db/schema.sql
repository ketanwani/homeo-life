create extension if not exists pgcrypto;

create type content_status as enum ('draft', 'published', 'archived');
create type appointment_status as enum ('scheduled', 'rescheduled', 'canceled', 'completed');

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  duration_minutes integer not null,
  price_cents integer not null,
  currency text not null default 'SGD',
  calendly_event_type_url text,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  calendly_event_uri text unique,
  service_title text not null,
  starts_at timestamptz not null,
  status appointment_status not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists content_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type text not null check (type in ('blog', 'case_story', 'faq')),
  title text not null,
  excerpt text not null default '',
  body text not null,
  cover_image_url text,
  video_url text,
  status content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null,
  condition_label text,
  rating integer not null check (rating between 1 and 5),
  quote text not null,
  status content_status not null default 'published',
  created_at timestamptz not null default now()
);

-- weekday: 0 = Sunday .. 6 = Saturday (JS Date#getDay() convention, used when generating slots).
create table if not exists doctor_availability (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null unique check (weekday between 0 and 6),
  is_available boolean not null default false,
  start_time time,
  end_time time,
  updated_at timestamptz not null default now(),
  check (not is_available or (start_time is not null and end_time is not null and start_time < end_time))
);

create table if not exists doctors (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists whatsapp_threads (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  patient_name text,
  current_state text not null default 'ai_active',
  assigned_to text,
  summary text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
