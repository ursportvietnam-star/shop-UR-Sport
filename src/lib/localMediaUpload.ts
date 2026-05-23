import { auth } from '../firebase';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export const uploadLocalImage = async (file: File, folder: string) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Vui long chon anh dinh dang JPG, PNG, WebP hoac GIF.');
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('File qua lon. Toi da 10MB.');
  }

  const token = await auth.currentUser?.getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': file.type,
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
