import React, { useRef } from 'react';
import {
  FileText,
  Image,
  Video,
  Music,
  Link as LinkIcon,
  X
} from 'lucide-react';

interface ChatAttachmentMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFiles: (files: FileList) => void;
  onOpenLinkModal: () => void;
}

export default function ChatAttachmentMenu({
  isOpen,
  onClose,
  onSelectFiles,
  onOpenLinkModal
}: ChatAttachmentMenuProps) {
  const docInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelectFiles(e.target.files);
      onClose();
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  return (
    <>
      {/* Hidden File Inputs for Each Category */}
      {/* 1. Documents: Word, PDF, PPT, Excel, CSV */}
      <input
        type="file"
        ref={docInputRef}
        onChange={handleFileInputChange}
        multiple
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
      />

      {/* 2. Images: JPG, PNG, WEBP, GIF */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleFileInputChange}
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        className="hidden"
      />

      {/* 3. Videos: MP4, WebM, MOV */}
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleFileInputChange}
        multiple
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        className="hidden"
      />

      {/* 4. Audio: MP3, WAV, M4A, OGG */}
      <input
        type="file"
        ref={audioInputRef}
        onChange={handleFileInputChange}
        multiple
        accept="audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,audio/ogg,audio/webm,.mp3,.wav,.m4a,.ogg"
        className="hidden"
      />

      {/* Menu Overlay Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover Bubble Menu */}
      <div
        className="absolute bottom-16 left-3 z-50 w-64 bg-[#FAF6F0] rounded-2xl neo-border neo-shadow-md p-2 space-y-1 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1.5 border-b border-gray-200 flex items-center justify-between text-[11px] font-black uppercase text-gray-700">
          <span>Lampirkan Berkas</span>
          <button onClick={onClose} className="p-0.5 text-gray-400 hover:text-gray-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 1. Dokumen */}
        <button
          type="button"
          onClick={() => docInputRef.current?.click()}
          className="w-full px-3 py-2 text-left rounded-xl hover:bg-white flex items-center gap-3 transition-colors text-xs font-black text-gray-800 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 neo-border-thin flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-gray-900">Dokumen</div>
            <div className="text-[10px] text-gray-500 font-medium">Word, PDF, PPT, Excel, CSV</div>
          </div>
        </button>

        {/* 2. Gambar */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="w-full px-3 py-2 text-left rounded-xl hover:bg-white flex items-center gap-3 transition-colors text-xs font-black text-gray-800 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 neo-border-thin flex items-center justify-center">
            <Image className="w-4 h-4" />
          </div>
          <div>
            <div className="text-gray-900">Gambar / Foto</div>
            <div className="text-[10px] text-gray-500 font-medium">JPG, PNG, WebP, GIF</div>
          </div>
        </button>

        {/* 3. Video */}
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          className="w-full px-3 py-2 text-left rounded-xl hover:bg-white flex items-center gap-3 transition-colors text-xs font-black text-gray-800 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 neo-border-thin flex items-center justify-center">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <div className="text-gray-900">Video</div>
            <div className="text-[10px] text-gray-500 font-medium">MP4, WebM, MOV</div>
          </div>
        </button>

        {/* 4. Audio */}
        <button
          type="button"
          onClick={() => audioInputRef.current?.click()}
          className="w-full px-3 py-2 text-left rounded-xl hover:bg-white flex items-center gap-3 transition-colors text-xs font-black text-gray-800 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 neo-border-thin flex items-center justify-center">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <div className="text-gray-900">Audio / Rekaman</div>
            <div className="text-[10px] text-gray-500 font-medium">MP3, WAV, M4A, OGG</div>
          </div>
        </button>

        {/* 5. Link */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenLinkModal();
          }}
          className="w-full px-3 py-2 text-left rounded-xl hover:bg-white flex items-center gap-3 transition-colors text-xs font-black text-gray-800 cursor-pointer border-t border-gray-100 pt-2"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 neo-border-thin flex items-center justify-center">
            <LinkIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-gray-900">Tautan Web / Link</div>
            <div className="text-[10px] text-gray-500 font-medium">Google Drive, Youtube, dsb</div>
          </div>
        </button>
      </div>
    </>
  );
}
