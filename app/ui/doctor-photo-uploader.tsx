"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImagePlus, ZoomIn } from "lucide-react";
import { uploadDoctorPhoto } from "@/app/doctor/actions";

// Must match the homepage's <Image width={720} height={820}> in app/page.tsx -- the whole point of
// this cropper is that what the doctor frames here is exactly what site visitors see, so if that
// display size ever changes, this needs to change with it.
const FRAME_WIDTH = 320;
const FRAME_ASPECT = 720 / 820;
const FRAME_HEIGHT = Math.round(FRAME_WIDTH / FRAME_ASPECT);
const OUTPUT_WIDTH = 900;
const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / FRAME_ASPECT);

type Offset = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function DoctorPhotoUploader({ photoUrl }: { photoUrl: string }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(uploadDoctorPhoto, { ok: false });

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOffset: Offset } | null>(null);

  useEffect(() => {
    if (state.ok) {
      setObjectUrl(null);
      router.refresh();
    }
  }, [state.ok, router]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const baseScale = naturalSize
    ? Math.max(FRAME_WIDTH / naturalSize.width, FRAME_HEIGHT / naturalSize.height)
    : 1;
  const scale = baseScale * zoom;
  const displayWidth = (naturalSize?.width ?? 0) * scale;
  const displayHeight = (naturalSize?.height ?? 0) * scale;

  const clampOffset = useCallback((next: Offset, width: number, height: number): Offset => {
    return {
      x: clamp(next.x, FRAME_WIDTH - width, 0),
      y: clamp(next.y, FRAME_HEIGHT - height, 0)
    };
  }, []);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(URL.createObjectURL(file));
    setNaturalSize(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, startOffset: offset };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    setOffset(
      clampOffset(
        { x: dragRef.current.startOffset.x + dx, y: dragRef.current.startOffset.y + dy },
        displayWidth,
        displayHeight
      )
    );
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleZoomChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextZoom = Number(event.target.value);
    if (!naturalSize) {
      setZoom(nextZoom);
      return;
    }
    const nextScale = baseScale * nextZoom;
    setZoom(nextZoom);
    setOffset((prev) =>
      clampOffset(prev, naturalSize.width * nextScale, naturalSize.height * nextScale)
    );
  }

  function handleCancelCrop() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setNaturalSize(null);
  }

  function handleConfirmCrop() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !naturalSize) return;

    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputScaleFactor = OUTPUT_WIDTH / FRAME_WIDTH;
    ctx.drawImage(
      img,
      offset.x * outputScaleFactor,
      offset.y * outputScaleFactor,
      displayWidth * outputScaleFactor,
      displayHeight * outputScaleFactor
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], "doctor-photo.jpg", { type: "image/jpeg" });
        const formData = new FormData();
        formData.append("photo", croppedFile);
        formAction(formData);
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <div className="profilePhotoPanel">
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-only thumbnail, not worth Next/Image's optimizer overhead */}
      <img className="profilePhotoPreview" src={photoUrl} alt="Current doctor profile photo" />

      <div className="profilePhotoForm">
        {!objectUrl ? (
          <label className="uploadBox">
            <ImagePlus size={22} />
            Choose a new photo (JPEG, PNG, or WebP, up to 5MB)
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
          </label>
        ) : (
          <div className="cropperPanel">
            <div
              className="cropperFrame"
              style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- pixels get drawn to a canvas below; next/image can't do that */}
              <img
                ref={imgRef}
                src={objectUrl}
                alt="Selected photo, drag to reposition"
                draggable={false}
                onLoad={handleImageLoad}
                style={{
                  width: displayWidth || undefined,
                  height: displayHeight || undefined,
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                  visibility: naturalSize ? "visible" : "hidden"
                }}
              />
            </div>

            <label className="cropperZoom">
              <ZoomIn size={16} />
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={handleZoomChange} />
            </label>
            <p className="cropperHint">Drag the photo to reposition it, use the slider to zoom.</p>

            <div className="cropperActions">
              <button type="button" className="button secondary compact" onClick={handleCancelCrop}>
                Cancel
              </button>
              <button
                type="button"
                className="button compact"
                onClick={handleConfirmCrop}
                disabled={isPending || !naturalSize}
              >
                <CheckCircle2 size={16} /> {isPending ? "Uploading..." : "Use this photo"}
              </button>
            </div>

            <canvas ref={canvasRef} hidden />
          </div>
        )}

        {state.message ? (
          <p className={state.ok ? "availabilitySuccess" : "authError"}>{state.message}</p>
        ) : null}
      </div>
    </div>
  );
}
