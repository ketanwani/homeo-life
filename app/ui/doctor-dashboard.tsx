"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CalendarDays,
  Camera,
  ClipboardList,
  Download,
  ImagePlus,
  MessageSquareText,
  PenLine,
  Save,
  UploadCloud
} from "lucide-react";
import { saveAvailability, uploadDoctorPhoto } from "@/app/doctor/actions";
import type { Appointment, DayAvailability } from "@/lib/types";

type Panel = "calendar" | "appointments" | "editor" | "faq" | "profile";

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function AvailabilityEditor({ availability }: { availability: DayAvailability[] }) {
  const [state, formAction, isPending] = useActionState(saveAvailability, { ok: false });

  const days = useMemo(() => {
    const byWeekday = new Map(availability.map((day) => [day.weekday, day]));
    return WEEKDAY_LABELS.map((label, weekday) => {
      const day = byWeekday.get(weekday);
      return {
        weekday,
        label,
        isAvailable: day?.isAvailable ?? false,
        startTime: day?.startTime ?? "09:00",
        endTime: day?.endTime ?? "17:00"
      };
    });
  }, [availability]);

  return (
    <form action={formAction}>
      <div className="availabilityGrid">
        {days.map((day) => (
          <div className="availabilityRow" key={day.weekday}>
            <label className="availabilityDayToggle">
              <input type="checkbox" name={`available-${day.weekday}`} defaultChecked={day.isAvailable} />
              {day.label}
            </label>
            <input type="time" name={`start-${day.weekday}`} defaultValue={day.startTime} aria-label={`${day.label} start time`} />
            <span>to</span>
            <input type="time" name={`end-${day.weekday}`} defaultValue={day.endTime} aria-label={`${day.label} end time`} />
          </div>
        ))}
      </div>
      {state.message ? (
        <p className={state.ok ? "availabilitySuccess" : "authError"}>{state.message}</p>
      ) : null}
      <button className="button compact availabilitySave" type="submit" disabled={isPending}>
        <Save size={16} /> {isPending ? "Saving..." : "Save availability"}
      </button>
    </form>
  );
}

function DoctorPhotoUploader({ photoUrl }: { photoUrl: string }) {
  const [state, formAction, isPending] = useActionState(uploadDoctorPhoto, { ok: false });

  return (
    <div className="profilePhotoPanel">
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-only thumbnail, not worth Next/Image's optimizer overhead */}
      <img className="profilePhotoPreview" src={photoUrl} alt="Current doctor profile photo" />
      <form action={formAction} encType="multipart/form-data" className="profilePhotoForm">
        <label className="uploadBox">
          <ImagePlus size={22} />
          Choose a new photo (JPEG, PNG, or WebP, up to 5MB)
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required />
        </label>
        {state.message ? (
          <p className={state.ok ? "availabilitySuccess" : "authError"}>{state.message}</p>
        ) : null}
        <button className="button compact" type="submit" disabled={isPending}>
          <UploadCloud size={16} /> {isPending ? "Uploading..." : "Upload photo"}
        </button>
      </form>
    </div>
  );
}

export function DashboardTabs({
  appointments,
  availability,
  photoUrl
}: {
  appointments: Appointment[];
  availability: DayAvailability[];
  photoUrl: string;
}) {
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
        <button className={active === "profile" ? "dashTab active" : "dashTab"} onClick={() => setActive("profile")}>
          <Camera size={18} /> Profile photo
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
            </div>
            <AvailabilityEditor availability={availability} />
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

        {active === "profile" ? (
          <section className="dashPanel">
            <div className="panelHeader">
              <div>
                <h3>Doctor profile photo</h3>
                <p>Shown in the "About the doctor" section on the homepage.</p>
              </div>
            </div>
            <DoctorPhotoUploader photoUrl={photoUrl} />
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function DoctorDashboard({
  appointments,
  availability,
  photoUrl
}: {
  appointments: Appointment[];
  availability: DayAvailability[];
  photoUrl: string;
}) {
  return <DashboardTabs appointments={appointments} availability={availability} photoUrl={photoUrl} />;
}
