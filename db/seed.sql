-- Initial content so the site isn't empty on a fresh database. Mirrors lib/seed.ts (the in-memory
-- fallback used when DATABASE_URL is unset) so behavior matches between the two modes.
-- The doctor account is intentionally NOT seeded here (passwords need bcrypt hashing at runtime) --
-- create it with `npm run create-doctor -- you@example.com yourpassword "Dr. Name"`.

insert into services (title, description, duration_minutes, price_cents, currency, is_featured) values
  ('Pre Consultation', 'A focused discovery call to understand concerns and recommend the right consultation path.', 15, 500, 'SGD', true),
  ('Online Consultation & Medicines', 'Complete virtual consultation with treatment planning, medicine guidance, and follow-up notes.', 45, 7000, 'SGD', true),
  ('Migraine Care', 'Constitutional assessment for recurring migraines, triggers, sleep patterns, and stress load.', 60, 9000, 'SGD', false),
  ('Skin & Psoriasis', 'Long-term support for acne, psoriasis, recurring eruptions, and flare-up management.', 60, 12000, 'SGD', false),
  ('Children''s Behavioural Care', 'Gentle support for focus, sleep, emotional regulation, and behavioural concerns in children.', 60, 12000, 'SGD', false),
  ('Women''s Health', 'Care for menstrual disorders, hormonal patterns, stress-linked symptoms, and fertility support.', 60, 12000, 'SGD', false);

insert into content_posts (slug, type, title, excerpt, body, cover_image_url, status, published_at) values
  (
    'preparing-for-online-homeopathy-consultation',
    'blog',
    'How to prepare for your first online homeopathy consultation',
    'What to note before your appointment so the case review is detailed, efficient, and useful.',
    'Bring your symptom timeline, triggers, medical history, current medicines, sleep pattern, food preferences, and questions.',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80',
    'published',
    '2026-07-16'
  ),
  (
    'why-follow-ups-matter',
    'blog',
    'Why follow-ups matter in chronic cases',
    'Healing patterns can be subtle. Structured follow-up helps treatment stay aligned with real progress.',
    'Follow-ups help the doctor understand response, aggravations, sleep, energy, mood, and symptom direction.',
    'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=900&q=80',
    'published',
    '2026-06-29'
  ),
  (
    'migraine-case-story',
    'case_story',
    'Migraine case story: fewer attacks, better recovery',
    'A patient journey focused on trigger mapping, constitution, and gradual improvement tracking.',
    'This anonymized story shows how recurring migraine patterns were reviewed and followed over multiple visits.',
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80',
    'published',
    '2026-05-21'
  ),
  (
    'child-sleep-case-story',
    'case_story',
    'Child sleep and irritability: a family follow-up journey',
    'A practical look at parent observations, sleep logs, and gentle ongoing support.',
    'The case story is anonymized and should be adapted to the doctor''s published clinical content.',
    'https://images.unsplash.com/photo-1531983412531-1f49a365ffed?auto=format&fit=crop&w=900&q=80',
    'published',
    '2026-04-18'
  ),
  (
    'online-consultations',
    'faq',
    'How do online consultations work?',
    'Book a Calendly slot, share pre-consultation information, and meet online at the confirmed time.',
    'Patients receive booking confirmation and can coordinate follow-up through WhatsApp.',
    null,
    'published',
    null
  ),
  (
    'reschedule-appointment',
    'faq',
    'Can I reschedule my appointment?',
    'Yes. Use your Calendly confirmation link or ask the WhatsApp assistant to help find a new slot.',
    'Rescheduling depends on available slots in the doctor''s calendar.',
    null,
    'published',
    null
  ),
  (
    'emergency-care',
    'faq',
    'Is this for emergencies?',
    'No. Urgent or emergency symptoms should be handled by local emergency medical services.',
    'The WhatsApp AI should include this safety boundary in all clinical conversations.',
    null,
    'published',
    null
  )
on conflict (slug) do nothing;

insert into testimonials (patient_name, condition_label, rating, quote) values
  ('Shalini', 'Family care', 5, 'The consultation was detailed and reassuring. Follow-up messages helped us stay clear on the next steps.'),
  ('A patient in Singapore', 'Skin care', 5, 'Dr. Neha listened carefully and looked at the full picture instead of only the visible symptoms.'),
  ('Parent of a child patient', 'Children''s care', 5, 'The process felt structured and calm. We appreciated the regular check-ins and practical guidance.');

insert into doctor_availability (weekday, is_available, start_time, end_time) values
  (0, false, null, null),
  (1, true, '10:00', '14:00'),
  (2, true, '16:00', '20:00'),
  (3, false, null, null),
  (4, false, null, null),
  (5, true, '11:00', '15:00'),
  (6, false, null, null)
on conflict (weekday) do nothing;

with seeded_patients as (
  insert into patients (full_name) values
    ('Priya S.'),
    ('Rahul M.'),
    ('Ananya K.')
  returning id, full_name
)
insert into appointments (patient_id, service_title, starts_at, status, notes)
select id, service_title, starts_at::timestamptz, status::appointment_status, notes
from seeded_patients
join (values
  ('Priya S.', 'Online Consultation & Medicines', '2026-08-24T10:30:00+08:00', 'scheduled', 'First consult, migraine history.'),
  ('Rahul M.', 'Skin & Psoriasis', '2026-08-25T18:00:00+08:00', 'rescheduled', 'Uploaded photos before appointment.'),
  ('Ananya K.', 'Children''s Behavioural Care', '2026-08-26T16:30:00+08:00', 'scheduled', 'Parent requested evening follow-up.')
) as seed_appointments (patient_name, service_title, starts_at, status, notes)
  on seed_appointments.patient_name = seeded_patients.full_name;
