import { getAppointments, getAvailability } from "./db";
import type { Service } from "./types";

// Singapore has no DST, so a fixed +08:00 offset is always correct -- matches the rest of the
// project's data (see lib/seed.ts sample appointments).
const TIMEZONE = "Asia/Singapore";
const DAYS_AHEAD = 21;
const SLOT_STEP_MINUTES = 30;
const MIN_LEAD_MINUTES = 60;

export type TimeSlot = { value: string; label: string };
export type DaySlots = { date: string; label: string; times: TimeSlot[] };

function formatIsoDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(date);
}

const SINGAPORE_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Do NOT derive this by re-parsing the "YYYY-MM-DD" string with a "T00:00:00+08:00" suffix and
// calling .getUTCDay() -- that instant is 2026-08-23T16:00:00Z for the date "2026-08-24", so
// getUTCDay() reads the UTC calendar day (the 23rd) and silently returns the *previous* day's
// weekday. Formatting the weekday directly from the original instant, in the target timezone,
// sidesteps that entirely -- this is what caught the bug (Monday's slots were being generated
// from Sunday's availability).
function getWeekday(date: Date): number {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "short" }).format(date);
  return SINGAPORE_WEEKDAYS.indexOf(short);
}

function formatTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeValue(minutes: number): string {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

// Returns, per service, the next DAYS_AHEAD days that have at least one bookable slot -- each slot
// is long enough for that service's duration, doesn't overlap an existing (non-canceled)
// appointment, and is at least MIN_LEAD_MINUTES from now. Different services have different
// durations, so this genuinely differs per service (a 60min service fits fewer slots into the same
// open window than a 15min one) -- that's why this returns a map rather than one shared list.
export async function getAvailableSlotsByService(
  servicesList: Service[]
): Promise<Record<string, DaySlots[]>> {
  const [availability, appointments] = await Promise.all([getAvailability(), getAppointments()]);
  const durationByTitle = new Map(servicesList.map((service) => [service.title, service.durationMinutes]));

  const blockedRanges = appointments
    .filter((appointment) => appointment.status !== "canceled")
    .map((appointment) => {
      const start = new Date(appointment.startsAt);
      const duration = durationByTitle.get(appointment.serviceTitle) ?? 60;
      return { start, end: new Date(start.getTime() + duration * 60_000) };
    });

  const now = new Date();
  const earliestStart = new Date(now.getTime() + MIN_LEAD_MINUTES * 60_000);
  const result: Record<string, DaySlots[]> = {};

  for (const service of servicesList) {
    const days: DaySlots[] = [];

    for (let offset = 0; offset < DAYS_AHEAD; offset++) {
      const day = new Date(now.getTime() + offset * 86_400_000);
      const dateStr = formatIsoDate(day);
      const weekday = getWeekday(day);

      const dayAvailability = availability.find((entry) => entry.weekday === weekday);
      if (!dayAvailability?.isAvailable || !dayAvailability.startTime || !dayAvailability.endTime) {
        continue;
      }

      const times: TimeSlot[] = [];
      const endMinutes = timeToMinutes(dayAvailability.endTime);
      let cursor = timeToMinutes(dayAvailability.startTime);

      while (cursor + service.durationMinutes <= endMinutes) {
        const slotStart = new Date(`${dateStr}T${minutesToTimeValue(cursor)}:00+08:00`);
        const slotEnd = new Date(slotStart.getTime() + service.durationMinutes * 60_000);

        const isTooSoon = slotStart < earliestStart;
        const overlapsExisting = blockedRanges.some(
          (blocked) => slotStart < blocked.end && blocked.start < slotEnd
        );

        if (!isTooSoon && !overlapsExisting) {
          times.push({ value: minutesToTimeValue(cursor), label: formatTimeLabel(slotStart) });
        }

        cursor += SLOT_STEP_MINUTES;
      }

      if (times.length > 0) {
        days.push({ date: dateStr, label: formatDateLabel(day), times });
      }
    }

    result[service.id] = days;
  }

  return result;
}
