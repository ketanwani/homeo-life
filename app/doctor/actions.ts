"use server";

import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { setAvailability } from "@/lib/db";
import { UPLOADS_DIR } from "@/lib/doctor-photo";
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

export type UploadPhotoState = {
  ok: boolean;
  message?: string;
};

const PHOTO_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export async function uploadDoctorPhoto(
  _prevState: UploadPhotoState,
  formData: FormData
): Promise<UploadPhotoState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "You need to be signed in to do that." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image file first." };
  }

  const extension = PHOTO_EXTENSION_BY_MIME_TYPE[file.type];
  if (!extension) {
    return { ok: false, message: "Use a JPEG, PNG, or WebP image." };
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, message: "Image must be 5MB or smaller." };
  }

  await mkdir(UPLOADS_DIR, { recursive: true });

  const existingFiles = await readdir(UPLOADS_DIR).catch(() => []);
  await Promise.all(
    existingFiles
      .filter((name) => name.startsWith("doctor-photo."))
      .map((name) => unlink(path.join(UPLOADS_DIR, name)).catch(() => {}))
  );

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, `doctor-photo.${extension}`), buffer);

  revalidatePath("/");
  revalidatePath("/doctor");

  return { ok: true, message: "Photo updated." };
}
