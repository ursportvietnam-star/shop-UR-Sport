import { auth } from '../firebase';
import type { ProductFactoryInput, ProductFactoryResult } from '../types/productFactory';

const buildAdminHeaders = async () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
    headers['x-dev-admin'] = '1';
    return headers;
  }

  const token = await auth.currentUser?.getIdToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const postJson = async <T>(url: string, body: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: await buildAdminHeaders(),
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Request failed: ${response.status}`);
  return data as T;
};

export const generateProductFactoryDraft = (input: ProductFactoryInput) =>
  postJson<ProductFactoryResult>('/api/admin/ai/product-factory/generate', input);

export const publishProductFactoryDraft = (draft: ProductFactoryResult) =>
  postJson<ProductFactoryResult & { legacyProduct?: any; published: boolean }>('/api/admin/ai/product-factory/publish', draft);
