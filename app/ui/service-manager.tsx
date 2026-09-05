"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, PlusCircle, Save, Trash2, X } from "lucide-react";
import { deleteServiceAction, saveService } from "@/app/doctor/actions";
import { formatMoney } from "@/lib/site";
import type { Service } from "@/lib/types";
import { ImageCropper } from "./image-cropper";

// Must match .serviceImage's aspect-ratio in app/globals.css -- the whole point of this cropper is
// that what the doctor frames here is exactly what site visitors see on the service card.
const SERVICE_IMAGE_ASPECT = 12 / 5;

function ServiceForm({ service, onDone }: { service: Service | null; onDone: () => void }) {
  const [state, formAction, isPending] = useActionState(saveService, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);
  const croppedImageRef = useRef<File | null>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      croppedImageRef.current = null;
      onDone();
    }
  }, [state.ok, onDone]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (croppedImageRef.current) {
      formData.set("image", croppedImageRef.current);
    }
    formAction(formData);
  }

  return (
    <form onSubmit={handleSubmit} ref={formRef} className="editorGrid" key={service?.id ?? "new"}>
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <input type="text" name="title" placeholder="Treatment name" defaultValue={service?.title} required />
      <textarea
        name="description"
        placeholder="What this consultation covers"
        defaultValue={service?.description}
        required
      />
      <div className="serviceFormRow">
        <label>
          Duration (minutes)
          <input type="number" name="durationMinutes" min={5} step={5} defaultValue={service?.durationMinutes ?? 45} required />
        </label>
        <label>
          Price
          <input
            type="number"
            name="price"
            min={0}
            step="0.01"
            defaultValue={service ? (service.priceCents / 100).toFixed(2) : undefined}
            required
          />
        </label>
        <label>
          Currency
          <input type="text" name="currency" maxLength={3} defaultValue={service?.currency ?? "SGD"} required />
        </label>
      </div>
      <label className="availabilityDayToggle">
        <input type="checkbox" name="isFeatured" defaultChecked={service?.isFeatured} />
        Feature this treatment
      </label>

      <ImageCropper
        aspect={SERVICE_IMAGE_ASPECT}
        outputWidth={900}
        outputFilename="treatment.jpg"
        existingImageUrl={service?.imageUrl}
        uploadLabel="Add an image (JPEG, PNG, or WebP, up to 5MB)"
        onCropped={(file) => {
          croppedImageRef.current = file;
        }}
      />

      {state.message ? <p className={state.ok ? "availabilitySuccess" : "authError"}>{state.message}</p> : null}

      <div className="cropperActions">
        {service ? (
          <button type="button" className="button secondary compact" onClick={onDone}>
            <X size={16} /> Cancel
          </button>
        ) : null}
        <button className="button compact" type="submit" disabled={isPending}>
          <Save size={16} /> {isPending ? "Saving..." : service ? "Save changes" : "Add treatment"}
        </button>
      </div>
    </form>
  );
}

function DeleteServiceButton({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState(deleteServiceAction, { ok: false });
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <form action={formAction} className="deleteConfirm">
        <input type="hidden" name="id" value={id} />
        <span>Remove this treatment?</span>
        <button type="button" className="button secondary compact" onClick={() => setConfirming(false)} disabled={isPending}>
          Cancel
        </button>
        <button type="submit" className="button compact" disabled={isPending}>
          <Trash2 size={16} /> {isPending ? "Removing..." : "Yes, delete"}
        </button>
      </form>
    );
  }

  return (
    <div>
      <button type="button" className="button secondary compact" onClick={() => setConfirming(true)}>
        <Trash2 size={16} /> Delete
      </button>
      {!state.ok && state.message ? <p className="authError">{state.message}</p> : null}
    </div>
  );
}

export function ServiceManager({ services }: { services: Service[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Service | "new" | null>(null);

  function closeForm() {
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="serviceManager">
      {editing ? (
        <ServiceForm service={editing === "new" ? null : editing} onDone={closeForm} />
      ) : (
        <button className="button compact" onClick={() => setEditing("new")}>
          <PlusCircle size={16} /> Add a treatment
        </button>
      )}

      <div className="serviceManagerList">
        {services.map((service) => (
          <article key={service.id} className="serviceManagerCard">
            {service.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin-only thumbnail, not worth Next/Image's optimizer overhead
              <img className="serviceManagerThumb" src={service.imageUrl} alt="" />
            ) : null}
            <div className="serviceManagerInfo">
              <strong>{service.title}</strong>
              <span>
                {service.durationMinutes} min &middot; {formatMoney(service.priceCents, service.currency)}
                {service.isFeatured ? " · Featured" : ""}
              </span>
              <p>{service.description}</p>
            </div>
            <div className="serviceManagerActions">
              <button type="button" className="button secondary compact" onClick={() => setEditing(service)}>
                <Pencil size={16} /> Edit
              </button>
              <DeleteServiceButton id={service.id} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
