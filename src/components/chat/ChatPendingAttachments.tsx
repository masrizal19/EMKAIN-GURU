import React from 'react';
import { formatFileSize, getFileCategoryInfo } from './chatUtils';
import { X, Globe, ExternalLink, Loader2 } from 'lucide-react';

export interface PendingFileItem {
  file: File;
  previewUrl?: string;
  category: 'doc' | 'pdf' | 'ppt' | 'excel' | 'image' | 'video' | 'audio' | 'other';
}

export interface PendingLinkItem {
  url: string;
  title?: string;
  description?: string;
}

interface ChatPendingAttachmentsProps {
  files: PendingFileItem[];
  link: PendingLinkItem | null;
  onRemoveFile: (index: number) => void;
  onRemoveLink: () => void;
  isUploading?: boolean;
}

export default function ChatPendingAttachments({
  files,
  link,
  onRemoveFile,
  onRemoveLink,
  isUploading
}: ChatPendingAttachmentsProps) {
  if (files.length === 0 && !link) return null;

  return (
    <div className="p-3 bg-[#F0ECE1] border-b border-gray-200 space-y-2">
      <div className="flex items-center justify-between text-[11px] font-black uppercase text-gray-700">
        <span>Lampiran yang Siap Dikirim ({files.length + (link ? 1 : 0)})</span>
        {isUploading && (
          <span className="flex items-center gap-1 text-blue-600 font-bold">
            <Loader2 className="w-3 h-3 animate-spin" /> Mengunggah...
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
        {/* Link preview card */}
        {link && (
          <div className="relative p-2 px-3 bg-white neo-border-thin rounded-xl flex items-center gap-2 max-w-xs shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0 pr-4">
              <div className="text-xs font-black text-gray-900 truncate">
                {link.title || link.url}
              </div>
              <div className="text-[10px] text-gray-500 truncate">
                {link.url}
              </div>
            </div>
            <button
              type="button"
              onClick={onRemoveLink}
              disabled={isUploading}
              className="absolute top-1.5 right-1.5 p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700"
              title="Hapus Link"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Files preview cards */}
        {files.map((item, idx) => {
          const info = getFileCategoryInfo(item.category, item.file.name);

          return (
            <div
              key={`${item.file.name}-${item.file.lastModified}-${idx}`}
              className="relative p-2 bg-white neo-border-thin rounded-xl flex items-center gap-2 max-w-xs shadow-2xs"
            >
              {/* Image Thumbnail Preview or Icon Badge */}
              {item.category === 'image' && item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="w-9 h-9 rounded-lg object-cover neo-border-thin flex-shrink-0"
                />
              ) : (
                <div className={`w-9 h-9 rounded-lg ${info.bgColor} ${info.textColor} neo-border-thin flex items-center justify-center font-black text-xs flex-shrink-0`}>
                  <span>{info.iconEmoji}</span>
                </div>
              )}

              {/* Name & Size */}
              <div className="min-w-0 pr-4">
                <p className="text-xs font-black text-gray-900 truncate max-w-[140px]" title={item.file.name}>
                  {item.file.name}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                  <span className={`px-1 rounded text-[8px] uppercase ${info.bgColor} text-white`}>
                    {info.label}
                  </span>
                  <span>{formatFileSize(item.file.size)}</span>
                </div>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemoveFile(idx)}
                disabled={isUploading}
                className="absolute top-1.5 right-1.5 p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 cursor-pointer"
                title="Hapus file ini"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
