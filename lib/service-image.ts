import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { UPLOADS_DIR } from "./uploads";
import type { Service } from "./types";

// Same on-disk pattern as the doctor photo (see lib/doctor-photo.ts and lib/uploads.ts), but there
// can be many services, so each one's image is named "service-<id>.<ext>" instead of a single
// well-known filename. One readdir() covers every service instead of one per card.
export async function attachServiceImages(inputServices: Service[]): Promise<Service[]> {
  let files: string[] = [];
  try {
    files = await readdir(UPLOADS_DIR);
  } catch {
    return inputServices;
  }

  return Promise.all(
    inputServices.map(async (service) => {
      const image = files.find((file) => file.startsWith(`service-${service.id}.`));
      if (!image) return service;

      const stats = await stat(path.join(UPLOADS_DIR, image));
      return { ...service, imageUrl: `/api/service-image/${service.id}?v=${Math.floor(stats.mtimeMs)}` };
    })
  );
}
