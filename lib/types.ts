export type Service = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  calendlyEventTypeUrl?: string;
  isFeatured?: boolean;
};

export type ContentPost = {
  id: string;
  slug: string;
  type: "blog" | "case_story" | "faq";
  title: string;
  excerpt: string;
  body: string;
  coverImageUrl?: string;
  videoUrl?: string;
  status: "draft" | "published" | "archived";
  publishedAt?: string;
};

export type Testimonial = {
  id: string;
  patientName: string;
  conditionLabel: string;
  rating: number;
  quote: string;
};

export type Appointment = {
  id: string;
  patientName: string;
  serviceTitle: string;
  startsAt: string;
  status: "scheduled" | "rescheduled" | "canceled" | "completed";
  notes?: string;
};
