"use client";

import * as React from "react";
import { FileText, Paperclip, Plus, Upload, Trash2, Loader2, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import {
  getDocumentsAction,
  createDocumentAction,
  updateDocumentAction,
  deleteDocumentAction,
} from "@/app/actions/documents";

export type DraftDocument = {
  tempId: string;
  type: "DOC" | "FILE";
  title: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
};

function formatSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The "Doc" tab panel. Lets users create rich-text documents and upload files
 * attached to a project or task.
 *
 * - Live mode: a `projectId` or `taskId` is provided (entity already exists) —
 *   documents are fetched and persisted immediately via server actions.
 * - Draft mode: neither id is provided (entity not created yet) — documents are
 *   held in `drafts` and the parent persists them after the entity is created.
 */
export function DocumentsPanel({
  projectId,
  taskId,
  entityLabel = "item",
  drafts,
  onDraftsChange,
}: {
  projectId?: string;
  taskId?: string;
  entityLabel?: string;
  drafts?: DraftDocument[];
  onDraftsChange?: (drafts: DraftDocument[]) => void;
}) {
  const isLive = !!(projectId || taskId);

  const [liveDocs, setLiveDocs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(isLive);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Composer state (for creating / editing a rich-text doc)
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [docTitle, setDocTitle] = React.useState("");
  const [docContent, setDocContent] = React.useState("");
  const [savingDoc, setSavingDoc] = React.useState(false);

  React.useEffect(() => {
    if (!isLive) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getDocumentsAction({ projectId, taskId });
      if (!cancelled) {
        if (res.success && res.documents) setLiveDocs(res.documents);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLive, projectId, taskId]);

  const items = isLive ? liveDocs : drafts ?? [];

  const openNewDoc = () => {
    setEditingId(null);
    setDocTitle("");
    setDocContent("");
    setComposerOpen(true);
  };

  const openEditDoc = (doc: any) => {
    setEditingId(isLive ? doc.id : doc.tempId);
    setDocTitle(doc.title);
    setDocContent(doc.content || "");
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setEditingId(null);
    setDocTitle("");
    setDocContent("");
  };

  const saveDoc = async () => {
    const title = docTitle.trim();
    if (!title) {
      toast.error("Please enter a document title.");
      return;
    }

    if (isLive) {
      setSavingDoc(true);
      try {
        if (editingId) {
          const res = await updateDocumentAction(editingId, { title, content: docContent });
          if (res.error) return toast.error(res.error);
          setLiveDocs((prev) => prev.map((d) => (d.id === editingId ? res.document : d)));
          toast.success("Document updated");
        } else {
          const res = await createDocumentAction({
            type: "DOC",
            title,
            content: docContent,
            projectId: projectId ?? null,
            taskId: taskId ?? null,
          });
          if (res.error) return toast.error(res.error);
          setLiveDocs((prev) => [res.document, ...prev]);
          toast.success("Document added");
        }
        closeComposer();
      } finally {
        setSavingDoc(false);
      }
    } else {
      // Draft mode
      const next = [...(drafts ?? [])];
      if (editingId) {
        const idx = next.findIndex((d) => d.tempId === editingId);
        if (idx >= 0) next[idx] = { ...next[idx], title, content: docContent };
      } else {
        next.unshift({
          tempId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          type: "DOC",
          title,
          content: docContent,
        });
      }
      onDraftsChange?.(next);
      closeComposer();
    }
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch("/api/conversations/upload", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return toast.error(data.error || "Upload failed");
      }

      if (isLive) {
        const res = await createDocumentAction({
          type: "FILE",
          title: data.name,
          fileUrl: data.url,
          fileName: data.name,
          fileSize: data.size,
          projectId: projectId ?? null,
          taskId: taskId ?? null,
        });
        if (res.error) return toast.error(res.error);
        setLiveDocs((prev) => [res.document, ...prev]);
        toast.success("File attached");
      } else {
        const next = [
          {
            tempId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type: "FILE" as const,
            title: data.name,
            fileUrl: data.url,
            fileName: data.name,
            fileSize: data.size,
          },
          ...(drafts ?? []),
        ];
        onDraftsChange?.(next);
      }
    } catch (err: any) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeItem = async (item: any) => {
    if (isLive) {
      const prev = liveDocs;
      setLiveDocs((p) => p.filter((d) => d.id !== item.id));
      const res = await deleteDocumentAction(item.id);
      if (res.error) {
        setLiveDocs(prev);
        toast.error(res.error);
      }
    } else {
      onDraftsChange?.((drafts ?? []).filter((d) => d.tempId !== item.tempId));
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openNewDoc}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors outline-none"
        >
          <Plus className="h-4 w-4" /> New doc
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors outline-none disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload file
        </button>
        <input ref={fileInputRef} type="file" onChange={handleFilePicked} className="hidden" />
      </div>

      {/* Composer */}
      {composerOpen && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3 space-y-3 bg-slate-50/50 dark:bg-white/5">
          <input
            autoFocus
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="Document title"
            className="w-full h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] px-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-slate-400"
          />
          <RichTextEditor content={docContent} onChange={setDocContent} placeholder="Write your document..." />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeComposer}
              className="px-3 py-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors outline-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveDoc}
              disabled={savingDoc}
              className="px-4 py-1.5 text-sm font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors outline-none disabled:opacity-50"
            >
              {savingDoc ? "Saving..." : editingId ? "Update" : "Add doc"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {isLive && loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading documents...
        </div>
      ) : items.length === 0 && !composerOpen ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
          <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No documents yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[280px]">
            Add a rich-text document or upload a file to attach it to this {entityLabel}.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item: any) => {
            const key = isLive ? item.id : item.tempId;
            const isFile = item.type === "FILE";
            return (
              <div
                key={key}
                className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] hover:border-slate-300 dark:hover:border-white/20 transition-colors"
              >
                <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${isFile ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>
                  {isFile ? <Paperclip className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.title}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    {isFile
                      ? `File${item.fileSize ? ` · ${formatSize(item.fileSize)}` : ""}`
                      : `Doc${item.createdBy?.name ? ` · ${item.createdBy.name}` : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isFile ? (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      aria-label="Open file"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openEditDoc(item)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      aria-label="Edit document"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
