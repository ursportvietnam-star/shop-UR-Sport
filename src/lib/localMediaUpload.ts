import { auth } from '../firebase';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const getFileType = (file: File) => {
  if (file.type) return file.type;
  return file.name.toLowerCase().endsWith('.ico') ? 'image/x-icon' : '';
};

export const uploadLocalImage = async (file: File, folder: string) => {
  const fileType = getFileType(file);

  if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
    throw new Error('Vui long chon anh dinh dang JPG, PNG, WebP, GIF hoac ICO.');
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('File qua lon. Toi da 10MB.');
  }

  const token = await auth.currentUser?.getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': fileType,
    'X-File-Name': encodeURIComponent(file.name),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`/api/upload-local-image/${encodeURIComponent(folder)}`, {
    method: 'POST',
    headers,
    body: file,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) {
    throw new Error(data.error || `Upload failed (${response.status})`);
  }

  return data.url as string;
};

export const syncSiteFavicon = async (favicon: string) => {
  const token = await auth.currentUser?.getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch('/api/site-favicon', {
    method: 'POST',
    headers,
    body: JSON.stringify({ favicon }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || `Sync favicon failed (${response.status})`);
  }

  return data.favicon as string;
};
