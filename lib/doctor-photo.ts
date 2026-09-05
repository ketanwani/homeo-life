import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { UPLOADS_DIR } from "./uploads";

// Uploaded photos live on disk under uploads/ rather than in Postgres -- there's only ever one
// photo, so a plain file is simpler than a DB blob. The filename is always "doctor-photo.<ext>";
// the upload action deletes any previous doctor-photo.* first so there's never more than one
// candidate file to find. See lib/uploads.ts for why this directory isn't under public/.

const FALLBACK_PHOTO_URL =
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80";

export async function getDoctorPhotoUrl(): Promise<string> {
  try {
    const files = await readdir(UPLOADS_DIR);
    const photo = files.find((file) => file.startsWith("doctor-photo."));
    if (!photo) return FALLBACK_PHOTO_URL;

    const stats = await stat(path.join(UPLOADS_DIR, photo));
    return `/api/doctor-photo?v=${Math.floor(stats.mtimeMs)}`;
  } catch {
    return FALLBACK_PHOTO_URL;
  }
}
