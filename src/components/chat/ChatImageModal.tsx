import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface ChatImageModalProps {
  imageUrl: string | null;
  imageName?: string;
  onClose: () => void;
}

export default function ChatImageModal({ imageUrl, imageName, onClose }: ChatImageModalProps) {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div
        className="relative max-w-4xl max-h-[90vh] bg-[#FAF6F0] rounded-3xl neo-border neo-shadow-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="p-3 px-4 bg-[#FAF6F0] border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-black text-gray-900 truncate max-w-md">
            {imageName || 'Lihat Foto'}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-white hover:bg-gray-100 neo-border-thin rounded-lg text-gray-800 flex items-center gap-1 text-[11px] font-bold"
              title="Buka di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={imageUrl.includes('download') ? imageUrl : imageUrl.replace('/api/chat/files/', '/api/chat/files/download/')}
              download={imageName || 'image'}
              className="p-1.5 px-2.5 bg-[#FF8B7B] hover:bg-[#ff9f8f] text-gray-900 neo-border-thin rounded-lg flex items-center gap-1 text-[11px] font-black"
              title="Unduh file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 bg-white hover:bg-gray-100 neo-border-thin rounded-lg text-gray-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#111111]/90 min-h-[300px]">
          <img
            src={imageUrl}
            alt={imageName || 'Attachment preview'}
            className="max-h-[75vh] max-w-full object-contain rounded-xl neo-border-thin shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
