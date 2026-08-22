import { readdir, stat } from "node:fs/promises";
import path from "node:path";

// Uploaded photos live on disk under uploads/ (a Docker volume in production, see
// docker-compose.yml) rather than in Postgres -- there's only ever one photo, so a plain file is
// simpler than a DB blob. Deliberately NOT under public/: Next's standalone production server
// builds its static-file route table once at process boot, so a file dropped into public/ after
// boot 404s until the container restarts -- which would break every doctor's first upload. Serving
// through app/api/doctor-photo/route.ts (a normal dynamic Route Handler, re-read from disk on every
// request) avoids that entirely. The filename is always "doctor-photo.<ext>"; the upload action
// deletes any previous doctor-photo.* first so there's never more than one candidate file to find.
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

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
