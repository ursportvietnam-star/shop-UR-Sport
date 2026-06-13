import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Auto-reload recovery on chunk load/import failures (usually due to version mismatch after deployment)
if (typeof window !== 'undefined') {
  const CHUNK_RELOAD_STORAGE_KEY = 'ursport_chunk_reload_at';
  const CHUNK_RELOAD_COOLDOWN_MS = 15000;

  const recoverFromChunkError = async () => {
    const lastReloadAt = Number(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) || 0);
    const now = Date.now();
    if (now - lastReloadAt < CHUNK_RELOAD_COOLDOWN_MS) {
      console.warn('Dynamic chunk error detected again after a recent reload. Skipping reload loop.');
      return;
    }

    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));

    try {
      const registrations = await navigator.serviceWorker?.getRegistrations?.();
      await Promise.all((registrations || []).map(registration => registration.update()));
    } catch (error) {
      console.warn('Service worker update check failed before chunk recovery reload:', error);
    }

    window.location.reload();
  };

  window.addEventListener('error', (event) => {
    const errorMsg = event.message || '';
    const target = event.target as HTMLElement | null;
    if (
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Importing a module script failed') ||
      (target && target.tagName === 'SCRIPT' && (target as HTMLScriptElement).src?.includes('/assets/'))
    ) {
      console.warn('Dynamic chunk import error detected. Reloading page...');
      void recoverFromChunkError();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = event.reason ? String(event.reason) : '';
    if (
      reasonStr.includes('Failed to fetch dynamically imported module') ||
      reasonStr.includes('Importing a module script failed')
    ) {
      console.warn('Dynamic chunk import rejection detected. Reloading page...');
      void recoverFromChunkError();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
