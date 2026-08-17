export const getApiUrl = (path: string): string => {
  const baseUrl = (import.meta as any).env.VITE_API_URL || '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // If baseUrl ends with '/' and cleanPath starts with '/', join them without double slashes
  if (baseUrl.endsWith('/') && cleanPath.startsWith('/')) {
    return `${baseUrl.slice(0, -1)}${cleanPath}`;
  }
  return `${baseUrl}${cleanPath}`;
};
