import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOADS_DIR } from "@/lib/uploads";

// Must stay dynamic (re-read from disk every request) -- see the comment in lib/doctor-photo.ts on
// why this can't be a static public/ file.
export const dynamic = "force-dynamic";

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

export async function GET() {
  try {
    const files = await readdir(UPLOADS_DIR);
    const photo = files.find((file) => file.startsWith("doctor-photo."));
    if (!photo) {
      return NextResponse.json({ error: "No photo uploaded" }, { status: 404 });
    }

    const extension = photo.split(".").pop() ?? "";
    const contentType = CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
    const buffer = await readFile(path.join(UPLOADS_DIR, photo));

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        // Safe to cache hard: the URL carries a ?v=<mtime> cache-buster, so a new upload is a new URL.
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "No photo uploaded" }, { status: 404 });
  }
}
