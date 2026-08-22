"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import type { Service } from "@/lib/types";
import { formatMoney } from "@/lib/site";

const timeSlots = ["10:00 AM", "11:30 AM", "4:00 PM", "6:30 PM"];
const dateOptions = [
  { label: "Mon, Aug 24", value: "2026-08-24" },
  { label: "Tue, Aug 25", value: "2026-08-25" },
  { label: "Fri, Aug 28", value: "2026-08-28" }
];

export function BookingWidget({ services }: { services: Service[] }) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(dateOptions[0].value);
  const [time, setTime] = useState(timeSlots[0]);
  const [submitted, setSubmitted] = useState(false);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? services[0],
    [serviceId, services]
  );

  return (
    <div className="bookingWidget">
      <div className="bookingForm">
        <div className="bookingIntro">
          <span className="formKicker">Step 1 of 3</span>
          <h3>Book a consultation</h3>
          <p>Choose a service, select a preferred slot, and share your contact details.</p>
        </div>

        <label>
          Service
          <select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.title} - {formatMoney(service.priceCents, service.currency)}
              </option>
            ))}
          </select>
        </label>

        <div className="slotGroup" aria-label="Choose appointment date">
          {dateOptions.map((option) => (
            <button
              className={date === option.value ? "slotButton active" : "slotButton"}
              key={option.value}
              onClick={() => setDate(option.value)}
              type="button"
            >
              <CalendarCheck size={16} />
              {option.label}
            </button>
          ))}
        </div>

        <div className="slotGroup" aria-label="Choose appointment time">
          {timeSlots.map((slot) => (
            <button
              className={time === slot ? "slotButton active" : "slotButton"}
              key={slot}
              onClick={() => setTime(slot)}
              type="button"
            >
              <Clock size={16} />
              {slot}
            </button>
          ))}
        </div>

        <div className="patientFields">
          <label>
            Full name
            <input placeholder="Your name" />
          </label>
          <label>
            WhatsApp number
            <input placeholder="+65 9000 0000" />
          </label>
          <label>
            Email
            <input placeholder="you@example.com" />
          </label>
          <label>
            Main concern
            <textarea placeholder="Briefly describe what you need help with." />
          </label>
        </div>

        <button className="button primary full" onClick={() => setSubmitted(true)} type="button">
          <CheckCircle2 size={18} />
          Request appointment
        </button>
      </div>

      <aside className="bookingSummary">
        <div className="summaryIcon"><UserRound size={24} /></div>
        <span>Selected appointment</span>
        <strong>{selectedService?.title ?? "Consultation"}</strong>
        <p>
          {dateOptions.find((option) => option.value === date)?.label} at {time}
        </p>
        {selectedService ? (
          <dl>
            <div>
              <dt>Duration</dt>
              <dd>{selectedService.durationMinutes} min</dd>
            </div>
            <div>
              <dt>Fee</dt>
              <dd>{formatMoney(selectedService.priceCents, selectedService.currency)}</dd>
            </div>
          </dl>
        ) : null}
        <div className="bookingAssurance">
          <div><ShieldCheck size={17} /> Private request</div>
          <div><MessageCircle size={17} /> WhatsApp confirmation</div>
          <div><CalendarCheck size={17} /> Easy rescheduling</div>
        </div>
        {submitted ? (
          <div className="confirmationNote">
            <CheckCircle2 size={18} />
            Your request is ready. In production this will reserve the slot and send confirmation by WhatsApp/email.
          </div>
        ) : null}
      </aside>
    </div>
  );
}
