import React from 'react';

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileCategoryInfo(category?: string, name?: string) {
  const ext = (name || '').split('.').pop()?.toLowerCase() || '';

  if (category === 'pdf' || ext === 'pdf') {
    return {
      label: 'PDF',
      bgColor: 'bg-rose-500',
      textColor: 'text-white',
      borderColor: 'border-rose-600',
      iconEmoji: '📕'
    };
  }

  if (category === 'doc' || ['doc', 'docx'].includes(ext)) {
    return {
      label: 'Word',
      bgColor: 'bg-blue-600',
      textColor: 'text-white',
      borderColor: 'border-blue-700',
      iconEmoji: '📘'
    };
  }

  if (category === 'excel' || ['xls', 'xlsx', 'csv'].includes(ext)) {
    return {
      label: ext === 'csv' ? 'CSV' : 'Excel',
      bgColor: 'bg-emerald-600',
      textColor: 'text-white',
      borderColor: 'border-emerald-700',
      iconEmoji: '📊'
    };
  }

  if (category === 'ppt' || ['ppt', 'pptx'].includes(ext)) {
    return {
      label: 'PPT',
      bgColor: 'bg-amber-600',
      textColor: 'text-white',
      borderColor: 'border-amber-700',
      iconEmoji: '📙'
    };
  }

  if (category === 'image' || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return {
      label: 'Foto',
      bgColor: 'bg-purple-600',
      textColor: 'text-white',
      borderColor: 'border-purple-700',
      iconEmoji: '🖼️'
    };
  }

  if (category === 'video' || ['mp4', 'webm', 'mov'].includes(ext)) {
    return {
      label: 'Video',
      bgColor: 'bg-red-600',
      textColor: 'text-white',
      borderColor: 'border-red-700',
      iconEmoji: '🎥'
    };
  }

  if (category === 'audio' || ['mp3', 'wav', 'm4a', 'ogg'].includes(ext)) {
    return {
      label: 'Audio',
      bgColor: 'bg-teal-600',
      textColor: 'text-white',
      borderColor: 'border-teal-700',
      iconEmoji: '🎵'
    };
  }

  return {
    label: ext.toUpperCase() || 'FILE',
    bgColor: 'bg-gray-700',
    textColor: 'text-white',
    borderColor: 'border-gray-800',
    iconEmoji: '📄'
  };
}
