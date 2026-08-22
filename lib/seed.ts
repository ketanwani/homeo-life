import type { Appointment, ContentPost, Service, Testimonial } from "./types";

export const services: Service[] = [
  {
    id: "pre-consult",
    title: "Pre Consultation",
    description: "A focused discovery call to understand concerns and recommend the right consultation path.",
    durationMinutes: 15,
    priceCents: 500,
    currency: "SGD",
    isFeatured: true
  },
  {
    id: "online-consult",
    title: "Online Consultation & Medicines",
    description: "Complete virtual consultation with treatment planning, medicine guidance, and follow-up notes.",
    durationMinutes: 45,
    priceCents: 7000,
    currency: "SGD",
    isFeatured: true
  },
  {
    id: "migraine",
    title: "Migraine Care",
    description: "Constitutional assessment for recurring migraines, triggers, sleep patterns, and stress load.",
    durationMinutes: 60,
    priceCents: 9000,
    currency: "SGD"
  },
  {
    id: "skin",
    title: "Skin & Psoriasis",
    description: "Long-term support for acne, psoriasis, recurring eruptions, and flare-up management.",
    durationMinutes: 60,
    priceCents: 12000,
    currency: "SGD"
  },
  {
    id: "children",
    title: "Children's Behavioural Care",
    description: "Gentle support for focus, sleep, emotional regulation, and behavioural concerns in children.",
    durationMinutes: 60,
    priceCents: 12000,
    currency: "SGD"
  },
  {
    id: "women",
    title: "Women's Health",
    description: "Care for menstrual disorders, hormonal patterns, stress-linked symptoms, and fertility support.",
    durationMinutes: 60,
    priceCents: 12000,
    currency: "SGD"
  }
];

export const contentPosts: ContentPost[] = [
  {
    id: "blog-1",
    slug: "preparing-for-online-homeopathy-consultation",
    type: "blog",
    title: "How to prepare for your first online homeopathy consultation",
    excerpt: "What to note before your appointment so the case review is detailed, efficient, and useful.",
    body: "Bring your symptom timeline, triggers, medical history, current medicines, sleep pattern, food preferences, and questions.",
    coverImageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80",
    status: "published",
    publishedAt: "2026-07-16"
  },
  {
    id: "blog-2",
    slug: "why-follow-ups-matter",
    type: "blog",
    title: "Why follow-ups matter in chronic cases",
    excerpt: "Healing patterns can be subtle. Structured follow-up helps treatment stay aligned with real progress.",
    body: "Follow-ups help the doctor understand response, aggravations, sleep, energy, mood, and symptom direction.",
    coverImageUrl: "https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=900&q=80",
    status: "published",
    publishedAt: "2026-06-29"
  },
  {
    id: "case-1",
    slug: "migraine-case-story",
    type: "case_story",
    title: "Migraine case story: fewer attacks, better recovery",
    excerpt: "A patient journey focused on trigger mapping, constitution, and gradual improvement tracking.",
    body: "This anonymized story shows how recurring migraine patterns were reviewed and followed over multiple visits.",
    coverImageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80",
    status: "published",
    publishedAt: "2026-05-21"
  },
  {
    id: "case-2",
    slug: "child-sleep-case-story",
    type: "case_story",
    title: "Child sleep and irritability: a family follow-up journey",
    excerpt: "A practical look at parent observations, sleep logs, and gentle ongoing support.",
    body: "The case story is anonymized and should be adapted to the doctor's published clinical content.",
    coverImageUrl: "https://images.unsplash.com/photo-1531983412531-1f49a365ffed?auto=format&fit=crop&w=900&q=80",
    status: "published",
    publishedAt: "2026-04-18"
  },
  {
    id: "faq-1",
    slug: "online-consultations",
    type: "faq",
    title: "How do online consultations work?",
    excerpt: "Book a Calendly slot, share pre-consultation information, and meet online at the confirmed time.",
    body: "Patients receive booking confirmation and can coordinate follow-up through WhatsApp.",
    status: "published"
  },
  {
    id: "faq-2",
    slug: "reschedule-appointment",
    type: "faq",
    title: "Can I reschedule my appointment?",
    excerpt: "Yes. Use your Calendly confirmation link or ask the WhatsApp assistant to help find a new slot.",
    body: "Rescheduling depends on available slots in the doctor's calendar.",
    status: "published"
  },
  {
    id: "faq-3",
    slug: "emergency-care",
    type: "faq",
    title: "Is this for emergencies?",
    excerpt: "No. Urgent or emergency symptoms should be handled by local emergency medical services.",
    body: "The WhatsApp AI should include this safety boundary in all clinical conversations.",
    status: "published"
  }
];

export const testimonials: Testimonial[] = [
  {
    id: "t-1",
    patientName: "Shalini",
    conditionLabel: "Family care",
    rating: 5,
    quote: "The consultation was detailed and reassuring. Follow-up messages helped us stay clear on the next steps."
  },
  {
    id: "t-2",
    patientName: "A patient in Singapore",
    conditionLabel: "Skin care",
    rating: 5,
    quote: "Dr. Neha listened carefully and looked at the full picture instead of only the visible symptoms."
  },
  {
    id: "t-3",
    patientName: "Parent of a child patient",
    conditionLabel: "Children's care",
    rating: 5,
    quote: "The process felt structured and calm. We appreciated the regular check-ins and practical guidance."
  }
];

export const appointments: Appointment[] = [
  {
    id: "a-1",
    patientName: "Priya S.",
    serviceTitle: "Online Consultation & Medicines",
    startsAt: "2026-08-24T10:30:00+08:00",
    status: "scheduled",
    notes: "First consult, migraine history."
  },
  {
    id: "a-2",
    patientName: "Rahul M.",
    serviceTitle: "Skin & Psoriasis",
    startsAt: "2026-08-25T18:00:00+08:00",
    status: "rescheduled",
    notes: "Uploaded photos before appointment."
  },
  {
    id: "a-3",
    patientName: "Ananya K.",
    serviceTitle: "Children's Behavioural Care",
    startsAt: "2026-08-26T16:30:00+08:00",
    status: "scheduled",
    notes: "Parent requested evening follow-up."
  }
];
