"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { setAvailability } from "@/lib/db";
import type { DayAvailability } from "@/lib/types";

export type SaveAvailabilityState = {
  ok: boolean;
  message?: string;
};

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export async function saveAvailability(
  _prevState: SaveAvailabilityState,
  formData: FormData
): Promise<SaveAvailabilityState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "You need to be signed in to do that." };
  }

  const days: DayAvailability[] = WEEKDAYS.map((weekday) => {
    const isAvailable = formData.get(`available-${weekday}`) === "on";
    const startTime = formData.get(`start-${weekday}`);
    const endTime = formData.get(`end-${weekday}`);

    return {
      weekday,
      isAvailable,
      startTime: isAvailable && typeof startTime === "string" && startTime ? startTime : undefined,
      endTime: isAvailable && typeof endTime === "string" && endTime ? endTime : undefined
    };
  });

  const hasInvalidDay = days.some(
    (day) => day.isAvailable && (!day.startTime || !day.endTime || day.startTime >= day.endTime)
  );
  if (hasInvalidDay) {
    return { ok: false, message: "Each open day needs a start time earlier than its end time." };
  }

  await setAvailability(days);
  revalidatePath("/doctor");

  return { ok: true, message: "Availability saved." };
}
