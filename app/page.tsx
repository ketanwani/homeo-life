import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  HeartPulse,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Newspaper,
  Phone,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Star
} from "lucide-react";
import { getFaqs, getPublishedPosts, getServices, getTestimonials } from "@/lib/db";
import { getDoctorPhotoUrl } from "@/lib/doctor-photo";
import { formatMoney, getWhatsAppUrl } from "@/lib/site";
import { BookingWidget } from "./ui/booking-widget";
import { HomeoLifeLogo } from "./ui/logo";

export default async function HomePage() {
  const [services, blogs, stories, faqs, testimonials, doctorPhotoUrl] = await Promise.all([
    getServices(),
    getPublishedPosts("blog"),
    getPublishedPosts("case_story"),
    getFaqs(),
    getTestimonials(),
    getDoctorPhotoUrl()
  ]);

  const whatsAppUrl = getWhatsAppUrl(
    "Hi Homeo Life, I would like help with treatment questions or appointment booking."
  );

  return (
    <>
      <header className="siteHeader">
        <Link className="brand" href="#top" aria-label="Homeo Life home">
          <HomeoLifeLogo />
        </Link>
        <nav className="navLinks" aria-label="Primary navigation">
          <Link href="#doctor">Doctor</Link>
          <Link href="#services">Services</Link>
          <Link href="#stories">Stories</Link>
          <Link href="#blogs">Blogs</Link>
          <Link href="#faq">FAQ</Link>
          <Link href="/doctor">Doctor login</Link>
        </nav>
        <Link className="headerCta" href="#book">Book</Link>
      </header>

      <main id="top">
        <section className="hero">
          <Image
            className="heroImage"
            src="https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1400&q=80"
            alt=""
            fill
            priority
            sizes="100vw"
          />
          <div className="heroOverlay" />
          <div className="heroInner">
            <div className="heroContent">
              <p className="eyebrow">Homeopathic care in Singapore</p>
              <h1>Personal care for long-term healing.</h1>
              <p>
                Detailed homeopathic consultations with Dr. Neha Mehta, supported by private online
                booking, patient education, and guided follow-up.
              </p>
              <div className="heroActions">
                <Link className="button primary" href="#book">
                  <CalendarCheck size={19} />
                  Book appointment
                </Link>
                <a className="button secondary onImage" href={whatsAppUrl}>
                  <MessageCircle size={19} />
                  Ask on WhatsApp
                </a>
              </div>
              <div className="trustRow" aria-label="Practice highlights">
                <span><strong>17+</strong> years</span>
                <span><strong>Online</strong> consults</span>
                <span><strong>AI</strong> support</span>
              </div>
            </div>
            <div className="heroCard" aria-label="Appointment preview">
              <span className="statusPill">Accepting appointments</span>
              <h2>Start with a focused consultation.</h2>
              <p>Choose your concern, pick a preferred slot, and receive confirmation from the clinic.</p>
              <div className="miniSchedule">
                <div>
                  <span>Next slots</span>
                  <strong>Mon 10:00 AM</strong>
                </div>
                <div>
                  <span>Visit type</span>
                  <strong>Online or follow-up</strong>
                </div>
              </div>
              <Link className="button primary full" href="#book">
                Check availability
              </Link>
            </div>
          </div>
        </section>

        <section id="doctor" className="section split">
          <div>
            <p className="eyebrow">About the doctor</p>
            <h2>Detailed case-taking with personal follow-through.</h2>
            <p>
              Dr. Neha Mehta is known for ethical practice and rare personal involvement in every case.
              At Homeo Life, patients get clear appointment flows, follow-up guidance, and practical
              support beyond the consultation room.
            </p>
            <div className="careMetrics">
              <div><strong>Private</strong><span>patient communication</span></div>
              <div><strong>Structured</strong><span>case follow-up</span></div>
              <div><strong>Guided</strong><span>online care</span></div>
            </div>
            <div className="credentialGrid">
              <div><GraduationCap /><span>B.H.M.S, MD (London)</span></div>
              <div><MapPin /><span>Anchorvale Lane, Singapore 541356</span></div>
              <div><ShieldCheck /><span>Consent-led patient communication</span></div>
            </div>
          </div>
          <div className="doctorVisual">
            <Image
              src={doctorPhotoUrl}
              alt="Dr. Neha Mehta"
              width={720}
              height={820}
            />
            <div className="floatingNote">
              <HeartPulse />
              <span>Clinical guidance with structured patient follow-up.</span>
            </div>
          </div>
        </section>

        <section id="services" className="section">
          <div className="sectionHeading">
            <p className="eyebrow">Treatment pathways</p>
            <h2>Services patients can compare and book.</h2>
            <p>Choose a consultation type and complete the booking request without leaving the site.</p>
          </div>
          <div className="serviceGrid">
            {services.map((service) => (
              <article className={service.isFeatured ? "serviceCard featured" : "serviceCard"} key={service.id}>
                <div>
                  <span className="serviceIcon"><HeartPulse size={18} /></span>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
                <div className="serviceMeta">
                  <span>{service.durationMinutes} min</span>
                  <strong>{formatMoney(service.priceCents, service.currency)}</strong>
                </div>
                <a className="cardAction" href="#book">
                  Book now <ArrowRight size={17} />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section id="ai-whatsapp" className="section aiSection">
          <div>
            <p className="eyebrow">AI WhatsApp support</p>
            <h2>A patient front desk that answers, books, and escalates.</h2>
            <p>
              The WhatsApp assistant can answer clinic FAQs, explain services, create or reschedule
              appointments, collect pre-consultation details, and summarize context before handing
              off to the doctor.
            </p>
            <div className="aiFlow">
              <span>Patient</span>
              <ArrowRight />
              <span>AI triage</span>
              <ArrowRight />
              <span>Book or escalate</span>
            </div>
          </div>
          <aside className="chatPanel">
            <div className="chatHeader">
              <span className="assistantAvatar"><Bot size={18} /></span>
              <div>
                <strong>Homeo Life assistant</strong>
                <small>Online now</small>
              </div>
            </div>
            <div className="chatBubble patient">Do you treat migraines online?</div>
            <div className="chatBubble agent">Yes. I can explain the consultation flow and check slots.</div>
            <div className="chatBubble patient">I want next Tuesday evening.</div>
            <div className="chatBubble agent">I found two evening slots. Should I reserve 6:30 PM?</div>
            <a className="button primary full" href={whatsAppUrl}>
              <MessageCircle size={18} />
              Start WhatsApp chat
            </a>
          </aside>
        </section>

        <section id="book" className="section bookingSection">
          <div className="sectionHeading">
            <p className="eyebrow">Appointments</p>
            <h2>Book directly on the Homeo Life website.</h2>
            <p>Patients can choose a service, request a time, and receive confirmation without being sent to another platform.</p>
          </div>
          <BookingWidget services={services} />
        </section>

        <section id="stories" className="section">
          <div className="rowHeading">
            <div>
              <p className="eyebrow">Case stories</p>
              <h2>Published outcomes and patient journeys.</h2>
            </div>
            <Link className="textLink" href="/doctor">Manage stories <ArrowRight size={17} /></Link>
          </div>
          <div className="storyGrid">
            {stories.map((story) => (
              <article className="storyCard" key={story.id}>
                {story.coverImageUrl ? <Image src={story.coverImageUrl} alt="" width={520} height={300} /> : null}
                <div>
                  <span>Case story</span>
                  <h3>{story.title}</h3>
                  <p>{story.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section carePathSection">
          <div className="sectionHeading">
            <p className="eyebrow">How care works</p>
            <h2>A clear path from first question to follow-up.</h2>
          </div>
          <div className="carePathGrid">
            <div><span>01</span><strong>Share your concern</strong><p>Use the website or WhatsApp assistant to describe what you need help with.</p></div>
            <div><span>02</span><strong>Book privately</strong><p>Select a consultation type and request a suitable appointment slot.</p></div>
            <div><span>03</span><strong>Consult deeply</strong><p>Dr. Neha reviews symptoms, history, triggers, and treatment direction.</p></div>
            <div><span>04</span><strong>Follow up</strong><p>Progress, questions, and next steps are handled through a structured workflow.</p></div>
          </div>
        </section>

        <section className="section testimonials">
          <div className="sectionHeading">
            <p className="eyebrow">Patient reviews</p>
            <h2>What patients say.</h2>
          </div>
          <div className="testimonialGrid">
            {testimonials.map((item) => (
              <article className="testimonialCard" key={item.id}>
                <div className="stars" aria-label={`${item.rating} star review`}>
                  {Array.from({ length: item.rating }).map((_, index) => <Star key={index} fill="currentColor" />)}
                </div>
                <p>{item.quote}</p>
                <strong>{item.patientName}</strong>
                <span>{item.conditionLabel}</span>
              </article>
            ))}
          </div>
        </section>

        <section id="blogs" className="section">
          <div className="rowHeading">
            <div>
              <p className="eyebrow">Doctor's blog</p>
              <h2>Practical guidance from the clinic.</h2>
            </div>
            <Link className="textLink" href="#videos">Watch videos <PlayCircle size={17} /></Link>
          </div>
          <div className="blogGrid">
            {blogs.map((post) => (
              <article className="blogCard" key={post.id}>
                {post.coverImageUrl ? <Image src={post.coverImageUrl} alt="" width={520} height={320} /> : null}
                <div>
                  <span><Newspaper size={15} /> Blog</span>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="videos" className="section videoSection">
          <div>
            <p className="eyebrow">Reels and videos</p>
            <h2>Short education clips for patients.</h2>
            <p>Connect Instagram and TikTok so patients can continue learning from Dr. Neha's videos.</p>
          </div>
          <div className="socialActions">
            <a className="button secondary" href="https://www.instagram.com/homeolife.co/" target="_blank" rel="noreferrer"><Instagram size={18} />Instagram</a>
            <a className="button secondary" href="#"><Music2 size={18} />TikTok</a>
            <Link className="button secondary" href="#blogs"><Newspaper size={18} />Blog</Link>
          </div>
        </section>

        <section id="faq" className="section faqSection">
          <div className="sectionHeading">
            <p className="eyebrow">FAQ</p>
            <h2>Common patient questions.</h2>
          </div>
          <div className="faqList">
            {faqs.map((faq) => (
              <details key={faq.id}>
                <summary>{faq.title}</summary>
                <p>{faq.excerpt}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="section roadmap">
          <div>
            <p className="eyebrow">Implementation roadmap</p>
            <h2>What becomes real behind this design.</h2>
          </div>
          <div className="roadmapGrid">
            <div><Bot /><strong>AI agent</strong><span>WhatsApp Cloud API webhook, retrieval over clinic content, escalation rules.</span></div>
            <div><CalendarCheck /><strong>Scheduling engine</strong><span>Native booking UI with appointment updates stored in PostgreSQL.</span></div>
            <div><ClipboardList /><strong>Doctor CMS</strong><span>Authenticated blog, FAQ, case story, media, and appointment workflows.</span></div>
            <div><Sparkles /><strong>Patient experience</strong><span>Mobile-first content, reviews, service comparison, social/video links.</span></div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <HomeoLifeLogo />
          <p>Anchorvale Lane, Singapore 541356</p>
        </div>
        <div className="footerLinks">
          <a href="tel:+6593571688"><Phone size={16} />+65 9357 1688</a>
          <a href="mailto:homeolife.sg@gmail.com"><Mail size={16} />homeolife.sg@gmail.com</a>
          <a href="https://www.instagram.com/homeolife.co/" target="_blank" rel="noreferrer"><Instagram size={16} />@homeolife.co</a>
        </div>
      </footer>
    </>
  );
}
