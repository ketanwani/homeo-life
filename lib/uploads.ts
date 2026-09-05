import path from "node:path";

// Runtime-uploaded files (doctor photo, treatment images) live here rather than under public/ --
// Next's standalone production server builds its public/ static-file route table once at process
// boot, so a file written after boot 404s until the container restarts. Everything here is served
// through dynamic Route Handlers instead (app/api/doctor-photo, app/api/service-image/[id]), which
// re-read from disk on every request and don't have that problem. This is a Docker volume in
// production (see docker-compose.yml).
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");
