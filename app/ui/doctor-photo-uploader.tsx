"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadDoctorPhoto } from "@/app/doctor/actions";
import { ImageCropper } from "./image-cropper";

// Must match the homepage's <Image width={720} height={820}> in app/page.tsx -- the whole point of
// this cropper is that what the doctor frames here is exactly what site visitors see, so if that
// display size ever changes, this needs to change with it.
const PHOTO_ASPECT = 720 / 820;

export function DoctorPhotoUploader({ photoUrl }: { photoUrl: string }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(uploadDoctorPhoto, { ok: false });

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  function handleCropped(file: File) {
    const formData = new FormData();
    formData.append("photo", file);
    formAction(formData);
  }

  return (
    <div className="profilePhotoPanel">
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-only thumbnail, not worth Next/Image's optimizer overhead */}
      <img className="profilePhotoPreview" src={photoUrl} alt="Current doctor profile photo" />

      <div className="profilePhotoForm">
        <ImageCropper
          aspect={PHOTO_ASPECT}
          outputWidth={900}
          outputFilename="doctor-photo.jpg"
          uploadLabel="Choose a new photo (JPEG, PNG, or WebP, up to 5MB)"
          onCropped={handleCropped}
          isPending={isPending}
        />

        {state.message ? (
          <p className={state.ok ? "availabilitySuccess" : "authError"}>{state.message}</p>
        ) : null}
      </div>
    </div>
  );
}
