import React, { useState } from 'react';
import { X, Link as LinkIcon, ExternalLink, Globe, Sparkles } from 'lucide-react';

interface ChatLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertLink: (linkData: { url: string; title?: string; description?: string }) => void;
}

export default function ChatLinkModal({ isOpen, onClose, onInsertLink }: ChatLinkModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFetchPreview = async () => {
    let cleanUrl = url.trim();
    if (!cleanUrl) return;

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
      setUrl(cleanUrl);
    }

    setLoadingPreview(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/chat/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTitle(data.title || '');
          setDescription(data.description || '');
        }
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Gagal memuat info link');
      }
    } catch (e) {
      console.error('Preview error:', e);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanUrl = url.trim();
    if (!cleanUrl) return;

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      new URL(cleanUrl);
    } catch (e) {
      setErrorMsg('Format URL tidak valid. Contoh: https://google.com');
      return;
    }

    onInsertLink({
      url: cleanUrl,
      title: title.trim() || undefined,
      description: description.trim() || undefined
    });

    // Reset & close
    setUrl('');
    setTitle('');
    setDescription('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-[#FAF6F0] rounded-3xl neo-border neo-shadow-lg p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <h3 className="text-sm font-black uppercase text-gray-900 font-display flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-[#FF8B7B]" />
            <span>Bagikan Link / Tautan Web</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-200 text-gray-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
              URL / Tautan Web *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="https://drive.google.com/... atau https://youtube.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => {
                  if (url.trim() && !title) {
                    handleFetchPreview();
                  }
                }}
                className="flex-1 px-3 py-2 bg-white neo-border-thin rounded-xl text-xs font-bold focus:outline-none focus:border-[#FF8B7B]"
              />
              <button
                type="button"
                onClick={handleFetchPreview}
                disabled={loadingPreview || !url.trim()}
                className="px-3 py-2 bg-white hover:bg-gray-100 neo-border-thin rounded-xl text-xs font-black text-gray-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Cek info link"
              >
                {loadingPreview ? '...' : <Sparkles className="w-3.5 h-3.5 text-[#FF8B7B]" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
              Judul Tautan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Modul Pembelajaran Bab 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white neo-border-thin rounded-xl text-xs font-bold focus:outline-none focus:border-[#FF8B7B]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
              Keterangan Tambahan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Silakan dipelajari untuk materi besok"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white neo-border-thin rounded-xl text-xs font-bold focus:outline-none focus:border-[#FF8B7B]"
            />
          </div>

          {/* Preview Card */}
          {url.trim() && (
            <div className="p-3 bg-white neo-border-thin rounded-xl space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-black text-blue-600">
                <Globe className="w-3 h-3" />
                <span>Pratinjau Tautan</span>
              </div>
              <p className="text-xs font-black text-gray-900 truncate">
                {title || url}
              </p>
              {description && (
                <p className="text-[11px] text-gray-500 line-clamp-2">
                  {description}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-100 neo-border-thin rounded-xl text-xs font-black text-gray-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!url.trim()}
              className="px-4 py-2 bg-[#FF8B7B] hover:bg-[#ff9f8f] text-gray-900 neo-border rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Lampirkan Link</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
