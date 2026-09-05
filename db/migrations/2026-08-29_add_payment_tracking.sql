-- Manual migration for databases that already existed before Stripe integration was added.
-- db/schema.sql was updated to include these columns for brand-new databases (applied
-- automatically via docker-entrypoint-initdb.d on first boot against an empty volume), but that
-- hook never re-runs against an already-initialized data directory -- there is no migration
-- runner in this project yet (see AGENTS.md), so apply this by hand against any existing DB:
--
--   docker compose exec -T postgres psql -U homeolife -d homeolife < db/migrations/2026-08-29_add_payment_tracking.sql
--
-- Safe to run more than once (the guards below make every statement a no-op on retry).

alter table appointments add column if not exists payment_status text not null default 'pending';
alter table appointments add column if not exists stripe_checkout_session_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_payment_status_check'
  ) then
    alter table appointments
      add constraint appointments_payment_status_check check (payment_status in ('pending', 'paid', 'failed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_stripe_checkout_session_id_key'
  ) then
    alter table appointments
      add constraint appointments_stripe_checkout_session_id_key unique (stripe_checkout_session_id);
  end if;
end $$;
