"use client";

import React from "react";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import CloudinaryAttachmentCard, { AttachmentItem } from "@/components/common/CloudinaryAttachmentCard";

/**
 * Reusable attachment strip used by the Task and Project create/edit modals.
 *
 * Behaviour (identical across modals):
 *  - Files picked via the parent's paperclip button (call `openFilePicker()` on
 *    the ref) are uploaded to Cloudinary via /api/upload/cloudinary.
 *  - While uploading, a lightweight "pending" chip with a spinner is shown.
 *  - Once uploaded, each file renders as a CloudinaryAttachmentCard with a
 *    three-dot menu: Rename / Copy URL / Download / Delete. (No cover-image
 *    option — we intentionally do not pass onSetCoverImage.)
 *
 * The committed attachments are owned by the parent (controlled via
 * `attachments` / `setAttachments`) so the parent can persist them to the DB on
 * save (as FILE documents).
 */
export interface AttachmentsFieldHandle {
  openFilePicker: () => void;
}

type PendingAttachment = {
  id: string;
  localUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
};

export const AttachmentsField = React.forwardRef<
  AttachmentsFieldHandle,
  {
    attachments: AttachmentItem[];
    setAttachments: React.Dispatch<React.SetStateAction<AttachmentItem[]>>;
    /** Optional label override for the section header count line. */
    className?: string;
  }
>(function AttachmentsField({ attachments, setAttachments, className }, ref) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<PendingAttachment[]>([]);

  React.useImperativeHandle(ref, () => ({
    openFilePicker: () => inputRef.current?.click(),
  }));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    // Snapshot the FileList into a real array BEFORE clearing the input —
    // `e.target.files` is live and `e.target.value = ""` empties it.
    const files = Array.from(fileList);
    e.target.value = "";

    const newPending: PendingAttachment[] = files.map((file) => ({
      id: `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      localUrl: URL.createObjectURL(file),
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    }));
    setPending((prev) => [...prev, ...newPending]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const pendingId = newPending[i].id;
      try {
        const fd = new FormData();
        fd.append("file", file);
        const resp = await fetch("/api/upload/cloudinary", { method: "POST", body: fd });
        const data = await resp.json();

        if (!resp.ok || !data.success) {
          toast.error(data.error || `Upload failed for ${file.name}`);
          setPending((prev) => prev.filter((p) => p.id !== pendingId));
          URL.revokeObjectURL(newPending[i].localUrl);
          continue;
        }

        const item: AttachmentItem = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          fileUrl: data.url,
          fileName: data.fileName ?? file.name,
          fileSize: data.fileSize ?? file.size,
          fileType: data.fileType ?? file.type,
          uploadedAt: data.uploadedAt,
          uploaderInitials: data.uploaderInitials,
          uploaderName: data.uploaderName,
        };

        setPending((prev) => prev.filter((p) => p.id !== pendingId));
        URL.revokeObjectURL(newPending[i].localUrl);
        setAttachments((prev) => [...prev, item]);
      } catch {
        toast.error(`Upload failed for ${file.name}`);
        setPending((prev) => prev.filter((p) => p.id !== pendingId));
        URL.revokeObjectURL(newPending[i].localUrl);
      }
    }
  };

  const total = attachments.length + pending.length;

  return (
    <>
      {total > 0 && (
        <div className={`mt-5 pt-5 border-t border-slate-100 dark:border-white/5 ${className ?? ""}`}>
          <div className="flex items-center gap-1.5 mb-3">
            <Paperclip size={12} className="text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Attachments ({total})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Committed attachments (rich card + hover menu) */}
            {attachments.map((item, idx) => (
              <CloudinaryAttachmentCard
                key={item.id || idx}
                attachment={item}
                index={idx}
                onRename={(i, newName) =>
                  setAttachments((prev) =>
                    prev.map((a, pi) => (pi === i ? { ...a, fileName: newName } : a)),
                  )
                }
                onDelete={(i) => setAttachments((prev) => prev.filter((_, pi) => pi !== i))}
                // NOTE: onSetCoverImage intentionally omitted → hides "Use as cover image"
              />
            ))}

            {/* Pending attachments (uploading) */}
            {pending.map((item) => {
              const isImg =
                item.fileType?.startsWith("image/") ||
                item.fileName?.match(/\.(jpeg|jpg|gif|png|webp|svg|avif)$/i);
              return (
                <div
                  key={item.id}
                  className="relative flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-[8px] bg-slate-100 dark:bg-white/8 border border-dashed border-slate-300 dark:border-white/20 min-w-0 max-w-[200px] opacity-75"
                >
                  <div className="relative w-9 h-9 rounded-[6px] overflow-hidden shrink-0 bg-slate-200 dark:bg-white/10">
                    {isImg ? (
                      <img src={item.localUrl} alt={item.fileName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Paperclip size={14} className="text-slate-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-[6px]">
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[110px]"
                      title={item.fileName}
                    >
                      {item.fileName}
                    </span>
                    <span className="text-[10px] text-slate-400">Uploading…</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <input type="file" ref={inputRef} className="hidden" onChange={handleFileChange} multiple />
    </>
  );
});
