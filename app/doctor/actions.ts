"use server";

import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createService, deleteService, setAvailability, updateService } from "@/lib/db";
import { UPLOADS_DIR } from "@/lib/uploads";
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

const IMAGE_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

  const extension = IMAGE_EXTENSION_BY_MIME_TYPE[file.type];
  if (!extension) {
    return { ok: false, message: "Use a JPEG, PNG, or WebP image." };
  }

  if (file.size > MAX_IMAGE_BYTES) {
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

export type SaveServiceState = {
  ok: boolean;
  message?: string;
};

export async function saveService(_prevState: SaveServiceState, formData: FormData): Promise<SaveServiceState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "You need to be signed in to do that." };
  }

  const id = formData.get("id");
  const title = formData.get("title");
  const description = formData.get("description");
  const durationMinutes = Number(formData.get("durationMinutes"));
  const price = Number(formData.get("price"));
  const currency = formData.get("currency");
  const isFeatured = formData.get("isFeatured") === "on";
  const image = formData.get("image");

  if (typeof title !== "string" || !title.trim()) {
    return { ok: false, message: "Give the treatment a name." };
  }
  if (typeof description !== "string" || !description.trim()) {
    return { ok: false, message: "Add a short description." };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { ok: false, message: "Duration must be a positive number of minutes." };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, message: "Price must be a positive amount." };
  }

  const input = {
    title: title.trim(),
    description: description.trim(),
    durationMinutes: Math.round(durationMinutes),
    priceCents: Math.round(price * 100),
    currency: typeof currency === "string" && currency.trim() ? currency.trim().toUpperCase() : "SGD",
    isFeatured
  };

  const isEditing = typeof id === "string" && id.length > 0;
  const serviceId = isEditing ? id : await createService(input);
  if (isEditing) {
    await updateService(id, input);
  }

  if (image instanceof File && image.size > 0) {
    const extension = IMAGE_EXTENSION_BY_MIME_TYPE[image.type];
    if (!extension) {
      return { ok: false, message: "Treatment saved, but the image must be a JPEG, PNG, or WebP." };
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return { ok: false, message: "Treatment saved, but the image must be 5MB or smaller." };
    }

    await mkdir(UPLOADS_DIR, { recursive: true });
    const existingFiles = await readdir(UPLOADS_DIR).catch(() => []);
    await Promise.all(
      existingFiles
        .filter((name) => name.startsWith(`service-${serviceId}.`))
        .map((name) => unlink(path.join(UPLOADS_DIR, name)).catch(() => {}))
    );

    const buffer = Buffer.from(await image.arrayBuffer());
    await writeFile(path.join(UPLOADS_DIR, `service-${serviceId}.${extension}`), buffer);
  }

  revalidatePath("/");
  revalidatePath("/doctor");

  return { ok: true, message: isEditing ? "Treatment updated." : "Treatment added." };
}

export type DeleteServiceState = {
  ok: boolean;
  message?: string;
};

export async function deleteServiceAction(
  _prevState: DeleteServiceState,
  formData: FormData
): Promise<DeleteServiceState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "You need to be signed in to do that." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { ok: false, message: "Missing treatment id." };
  }

  await deleteService(id);

  const existingFiles = await readdir(UPLOADS_DIR).catch(() => []);
  await Promise.all(
    existingFiles
      .filter((name) => name.startsWith(`service-${id}.`))
      .map((name) => unlink(path.join(UPLOADS_DIR, name)).catch(() => {}))
  );

  revalidatePath("/");
  revalidatePath("/doctor");

  return { ok: true, message: "Treatment removed." };
}
