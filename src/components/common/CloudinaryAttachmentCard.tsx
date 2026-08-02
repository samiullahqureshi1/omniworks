'use client';

import React, { useState } from 'react';
import { Maximize2, MoreHorizontal, Pencil, Share2, Download, Image as ImageIcon, Trash2, FileText, Check, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export interface AttachmentItem {
  id?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  uploadedAt?: string;
  uploaderInitials?: string;
  uploaderName?: string;
}

interface CloudinaryAttachmentCardProps {
  attachment: AttachmentItem;
  index: number;
  onDelete?: (index: number) => void;
  onRename?: (index: number, newName: string) => void;
  onSetCoverImage?: (url: string) => void;
}

export default function CloudinaryAttachmentCard({
  attachment,
  index,
  onDelete,
  onRename,
  onSetCoverImage,
}: CloudinaryAttachmentCardProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamedTitle, setRenamedTitle] = useState(attachment.fileName || 'Attachment');

  const isImage =
    attachment.fileUrl?.match(/\.(jpeg|jpg|gif|png|webp|svg|avif)($|\?)/i) ||
    attachment.fileType?.startsWith('image/') ||
    attachment.fileName?.match(/\.(jpeg|jpg|gif|png|webp|svg|avif)$/i);

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (attachment.fileUrl) {
      navigator.clipboard.writeText(attachment.fileUrl);
      toast.success('URL copied to clipboard');
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!attachment.fileUrl) return;
    const a = document.createElement('a');
    a.href = attachment.fileUrl;
    a.download = attachment.fileName || 'download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Downloading file...');
  };

  const handleSetCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSetCoverImage && attachment.fileUrl) {
      onSetCoverImage(attachment.fileUrl);
      toast.success('Set as cover image!');
    }
  };

  const handleSaveRename = () => {
    if (onRename && renamedTitle.trim()) {
      onRename(index, renamedTitle.trim());
      toast.success('File renamed');
    }
    setIsRenaming(false);
  };

  const formattedDate = React.useMemo(() => {
    if (!attachment.uploadedAt) {
      const d = new Date();
      return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()} at ${d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
    try {
      const d = new Date(attachment.uploadedAt);
      return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()} at ${d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } catch {
      return attachment.uploadedAt;
    }
  }, [attachment.uploadedAt]);

  const initials = attachment.uploaderInitials || 'SU';

  return (
    <>
      <div className="w-64 bg-[#f4f4f6] dark:bg-[#202024] border border-slate-200/60 dark:border-white/10 rounded-2xl p-3.5 flex flex-col justify-between relative group shadow-xs transition-all hover:shadow-md">
        {/* Top Thumbnail Box */}
        <div className="w-full h-36 bg-slate-200/50 dark:bg-white/5 rounded-xl overflow-hidden relative flex items-center justify-center p-2 mb-3">
          {isImage ? (
            <img
              src={attachment.fileUrl}
              alt={attachment.fileName}
              className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
              <FileText size={40} className="stroke-[1.5]" />
              <span className="text-[10px] uppercase font-bold tracking-wider mt-1">
                {attachment.fileName.split('.').pop() || 'FILE'}
              </span>
            </div>
          )}

          {/* Floating Action Menu Top-Right */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
            {/* Expand / Lightbox Button */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="p-1.5 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-lg shadow-xs transition-transform hover:scale-105 cursor-pointer"
              title="Expand image"
            >
              <Maximize2 size={13} />
            </button>

            {/* Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1.5 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-lg shadow-xs transition-transform hover:scale-105 cursor-pointer outline-none"
                  title="Attachment options"
                >
                  <MoreHorizontal size={13} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#1c1c1f] rounded-xl border border-slate-200 dark:border-white/10 p-1.5 shadow-xl text-slate-700 dark:text-slate-200 z-50">
                <DropdownMenuItem
                  onClick={() => setIsRenaming(true)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Pencil size={14} className="text-slate-500" />
                  <span>Rename</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleCopyUrl}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Share2 size={14} className="text-slate-500" />
                  <span>Copy URL</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleDownload}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Download size={14} className="text-slate-500" />
                  <span>Download</span>
                </DropdownMenuItem>

                {isImage && onSetCoverImage && (
                  <DropdownMenuItem
                    onClick={handleSetCover}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <ImageIcon size={14} className="text-slate-500" />
                    <span>Use as cover image</span>
                  </DropdownMenuItem>
                )}

                {onDelete && (
                  <>
                    <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => onDelete(index)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bottom Details Footer */}
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex flex-col min-w-0 flex-1">
            {isRenaming ? (
              <div className="flex items-center gap-1 my-0.5">
                <input
                  type="text"
                  value={renamedTitle}
                  onChange={(e) => setRenamedTitle(e.target.value)}
                  className="text-xs px-1.5 py-0.5 rounded border border-indigo-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveRename}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenaming(false)}
                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate" title={attachment.fileName}>
                {attachment.fileName}
              </span>
            )}
            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-400 truncate mt-0.5">
              {formattedDate}
            </span>
          </div>

          {/* User Avatar Circle */}
          <div
            className="w-7 h-7 rounded-full bg-[#4a4d52] dark:bg-[#383a3d] text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs uppercase tracking-tight"
            title={attachment.uploaderName || 'Uploaded by user'}
          >
            {initials}
          </div>
        </div>
      </div>

      {/* Lightbox Preview Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
            {isImage ? (
              <img
                src={attachment.fileUrl}
                alt={attachment.fileName}
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl">
                <FileText size={64} className="text-indigo-500 mb-4" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                  {attachment.fileName}
                </h3>
                <a
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md mt-2 flex items-center gap-2"
                >
                  <Download size={16} /> Open & Download File
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
