"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, ZoomIn } from "lucide-react";

type Offset = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export type ImageCropperProps = {
  /** width / height, of both the crop frame and the produced output file -- pass whatever the
   * final display's CSS `aspect-ratio` is, so what the doctor frames here is exactly what site
   * visitors see. */
  aspect: number;
  frameWidth?: number;
  outputWidth?: number;
  outputFilename?: string;
  /** Shown as a static preview when nothing new has been picked yet in this session. */
  existingImageUrl?: string;
  uploadLabel: string;
  replaceLabel?: string;
  confirmLabel?: string;
  isPending?: boolean;
  onCropped: (file: File) => void;
};

export function ImageCropper({
  aspect,
  frameWidth = 320,
  outputWidth = 900,
  outputFilename = "image.jpg",
  existingImageUrl,
  uploadLabel,
  replaceLabel = "Replace image",
  confirmLabel = "Use this photo",
  isPending = false,
  onCropped
}: ImageCropperProps) {
  const frameHeight = Math.round(frameWidth / aspect);
  const outputHeight = Math.round(outputWidth / aspect);

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOffset: Offset } | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const baseScale = naturalSize
    ? Math.max(frameWidth / naturalSize.width, frameHeight / naturalSize.height)
    : 1;
  const scale = baseScale * zoom;
  const displayWidth = (naturalSize?.width ?? 0) * scale;
  const displayHeight = (naturalSize?.height ?? 0) * scale;

  const clampOffset = useCallback(
    (next: Offset, width: number, height: number): Offset => ({
      x: clamp(next.x, frameWidth - width, 0),
      y: clamp(next.y, frameHeight - height, 0)
    }),
    [frameWidth, frameHeight]
  );

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
    setOffset((prev) => clampOffset(prev, naturalSize.width * nextScale, naturalSize.height * nextScale));
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

    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputScaleFactor = outputWidth / frameWidth;
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
        const croppedFile = new File([blob], outputFilename, { type: "image/jpeg" });

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(croppedFile));
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
        setNaturalSize(null);

        onCropped(croppedFile);
      },
      "image/jpeg",
      0.92
    );
  }

  if (!objectUrl) {
    const currentPreview = previewUrl ?? existingImageUrl;
    return (
      <div className="imageCropperIdle">
        {currentPreview ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview only, not worth Next/Image's optimizer overhead
          <img className="imageCropperPreview" src={currentPreview} alt="" style={{ aspectRatio: aspect }} />
        ) : null}
        <label className="uploadBox">
          <ImagePlus size={22} />
          {currentPreview ? replaceLabel : uploadLabel}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
        </label>
      </div>
    );
  }

  return (
    <div className="cropperPanel">
      <div
        className="cropperFrame"
        style={{ width: frameWidth, height: frameHeight }}
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
          <CheckCircle2 size={16} /> {isPending ? "Uploading..." : confirmLabel}
        </button>
      </div>

      <canvas ref={canvasRef} hidden />
    </div>
  );
}
