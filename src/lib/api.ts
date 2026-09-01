/// <reference types="vite/client" />

export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Use relative paths on sandbox/preview/development environments so the frontend calls the local Express backend
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (
      hostname.includes('run.app') || 
      hostname.includes('localhost') || 
      hostname.includes('127.0.0.1') ||
      hostname.includes('gitpod') ||
      hostname.includes('googleusercontent.com')
    ) {
      return cleanPath;
    }
  }

  const baseUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (baseUrl) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}${cleanPath}`;
  }
  
  return cleanPath;
};
