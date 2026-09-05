import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOADS_DIR } from "@/lib/uploads";

// Must stay dynamic (re-read from disk every request) -- see lib/uploads.ts for why.
export const dynamic = "force-dynamic";

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const files = await readdir(UPLOADS_DIR);
    // Matching against the real directory listing (not building a path from `id` directly) means
    // an unexpected id just fails to match anything -- no path-traversal surface here.
    const image = files.find((file) => file.startsWith(`service-${id}.`));
    if (!image) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 404 });
    }

    const extension = image.split(".").pop() ?? "";
    const contentType = CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
    const buffer = await readFile(path.join(UPLOADS_DIR, image));

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "No image uploaded" }, { status: 404 });
  }
}
