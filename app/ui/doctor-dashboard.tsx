"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Download,
  ImagePlus,
  MessageSquareText,
  PenLine,
  RefreshCw,
  Save,
  UploadCloud
} from "lucide-react";
import type { Appointment } from "@/lib/types";

type Panel = "calendar" | "appointments" | "editor" | "faq";

export function DashboardTabs({ appointments }: { appointments: Appointment[] }) {
  const [active, setActive] = useState<Panel>("calendar");
  const nextAppointment = useMemo(() => appointments.find((item) => item.status !== "canceled"), [appointments]);

  return (
    <div className="dashboardShell">
      <aside className="dashboardNav" aria-label="Doctor dashboard sections">
        <button className={active === "calendar" ? "dashTab active" : "dashTab"} onClick={() => setActive("calendar")}>
          <CalendarDays size={18} /> Calendar
        </button>
        <button className={active === "appointments" ? "dashTab active" : "dashTab"} onClick={() => setActive("appointments")}>
          <ClipboardList size={18} /> Appointments
        </button>
        <button className={active === "editor" ? "dashTab active" : "dashTab"} onClick={() => setActive("editor")}>
          <PenLine size={18} /> Content
        </button>
        <button className={active === "faq" ? "dashTab active" : "dashTab"} onClick={() => setActive("faq")}>
          <MessageSquareText size={18} /> FAQ
        </button>
      </aside>

      <div className="dashboardPanels">
        {active === "calendar" ? (
          <section className="dashPanel">
            <div className="panelHeader">
              <div>
                <h3>Consultation availability</h3>
                <p>{nextAppointment ? `Next appointment: ${nextAppointment.patientName}` : "No upcoming appointments"}</p>
              </div>
              <button className="button compact"><RefreshCw size={16} /> Sync</button>
            </div>
            <div className="availabilityGrid">
              <label>Monday<input type="text" defaultValue="10:00 - 14:00" /></label>
              <label>Tuesday<input type="text" defaultValue="16:00 - 20:00" /></label>
              <label>Friday<input type="text" defaultValue="11:00 - 15:00" /></label>
            </div>
          </section>
        ) : null}

        {active === "appointments" ? (
          <section className="dashPanel">
            <div className="panelHeader">
              <div>
                <h3>Patient appointments</h3>
                <p>Synced from the scheduling system into PostgreSQL.</p>
              </div>
              <button className="button compact"><Download size={16} /> Export</button>
            </div>
            <div className="appointmentList">
              {appointments.map((appointment) => (
                <article key={appointment.id}>
                  <strong>{appointment.patientName}</strong>
                  <span>{appointment.serviceTitle}</span>
                  <time>{new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.startsAt))}</time>
                  <em>{appointment.status}</em>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {active === "editor" ? (
          <section className="dashPanel">
            <div className="panelHeader">
              <div>
                <h3>Publish blog or case story</h3>
                <p>Create posts with images, videos, and patient-friendly summaries.</p>
              </div>
              <button className="button compact"><UploadCloud size={16} /> Publish</button>
            </div>
            <div className="editorGrid">
              <input type="text" defaultValue="Managing chronic migraines with constitutional care" aria-label="Post title" />
              <select aria-label="Content type" defaultValue="blog">
                <option value="blog">Blog post</option>
                <option value="case_story">Case story</option>
              </select>
              <textarea aria-label="Post body" defaultValue="Draft clinical notes, patient-friendly advice, images, and video links here." />
              <label className="uploadBox">
                <ImagePlus size={22} />
                Attach images or videos
                <input type="file" multiple />
              </label>
            </div>
          </section>
        ) : null}

        {active === "faq" ? (
          <section className="dashPanel">
            <div className="panelHeader">
              <div>
                <h3>FAQ publisher</h3>
                <p>Published answers can also feed the WhatsApp AI knowledge base.</p>
              </div>
              <button className="button compact"><Save size={16} /> Save</button>
            </div>
            <div className="faqEditor">
              <input type="text" defaultValue="How do online consultations work?" />
              <textarea defaultValue="Patients request a slot, receive a confirmation, and share pre-consultation details securely before the session." />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function DoctorDashboard({ appointments }: { appointments: Appointment[] }) {
  return <DashboardTabs appointments={appointments} />;
}
