"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import { requestAppointment } from "../actions";
import type { DaySlots } from "@/lib/booking";
import { formatMoney } from "@/lib/site";
import type { Service } from "@/lib/types";

export function BookingWidget({
  services,
  slotsByService
}: {
  services: Service[];
  slotsByService: Record<string, DaySlots[]>;
}) {
  const [state, formAction, isPending] = useActionState(requestAppointment, { ok: false });
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");

  const days = slotsByService[serviceId] ?? [];
  const [date, setDate] = useState(days[0]?.date ?? "");
  const [time, setTime] = useState(days[0]?.times[0]?.value ?? "");

  useEffect(() => {
    const nextDays = slotsByService[serviceId] ?? [];
    setDate(nextDays[0]?.date ?? "");
    setTime(nextDays[0]?.times[0]?.value ?? "");
  }, [serviceId, slotsByService]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? services[0],
    [serviceId, services]
  );
  const selectedDay = days.find((day) => day.date === date);
  const timesForDay = selectedDay?.times ?? [];
  const selectedTimeLabel = timesForDay.find((slot) => slot.value === time)?.label;

  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    const nextDay = days.find((day) => day.date === nextDate);
    setTime(nextDay?.times[0]?.value ?? "");
  }

  return (
    <div className="bookingWidget">
      <form className="bookingForm" action={formAction}>
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="time" value={time} />

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

        {days.length === 0 ? (
          <p className="authError">
            No online slots are open for this service right now. Please message us on WhatsApp to
            arrange a time.
          </p>
        ) : (
          <>
            <div className="slotGroup" aria-label="Choose appointment date">
              {days.map((day) => (
                <button
                  className={date === day.date ? "slotButton active" : "slotButton"}
                  key={day.date}
                  onClick={() => handleDateChange(day.date)}
                  type="button"
                >
                  <CalendarCheck size={16} />
                  {day.label}
                </button>
              ))}
            </div>

            <div className="slotGroup" aria-label="Choose appointment time">
              {timesForDay.map((slot) => (
                <button
                  className={time === slot.value ? "slotButton active" : "slotButton"}
                  key={slot.value}
                  onClick={() => setTime(slot.value)}
                  type="button"
                >
                  <Clock size={16} />
                  {slot.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="patientFields">
          <label>
            Full name
            <input name="fullName" placeholder="Your name" required />
          </label>
          <label>
            WhatsApp number
            <input name="phone" placeholder="+65 9000 0000" required />
          </label>
          <label>
            Email
            <input name="email" type="email" placeholder="you@example.com" />
          </label>
          <label>
            Main concern
            <textarea name="concern" placeholder="Briefly describe what you need help with." />
          </label>
        </div>

        {state.message ? <p className={state.ok ? "availabilitySuccess" : "authError"}>{state.message}</p> : null}

        <button className="button primary full" type="submit" disabled={isPending || !date || !time}>
          <CheckCircle2 size={18} />
          {isPending ? "Requesting..." : "Request appointment"}
        </button>
      </form>

      <aside className="bookingSummary">
        <div className="summaryIcon"><UserRound size={24} /></div>
        <span>Selected appointment</span>
        <strong>{selectedService?.title ?? "Consultation"}</strong>
        <p>{selectedDay ? `${selectedDay.label} at ${selectedTimeLabel ?? "--"}` : "Choose a date and time"}</p>
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
        {state.ok ? (
          <div className="confirmationNote">
            <CheckCircle2 size={18} />
            {state.message}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
