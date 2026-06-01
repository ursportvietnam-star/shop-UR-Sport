import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Auto-reload recovery on chunk load/import failures (usually due to version mismatch after deployment)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const errorMsg = event.message || '';
    const target = event.target as HTMLElement | null;
    if (
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Importing a module script failed') ||
      (target && target.tagName === 'SCRIPT' && (target as HTMLScriptElement).src?.includes('/assets/'))
    ) {
      console.warn('Dynamic chunk import error detected. Reloading page...');
      window.location.reload();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = event.reason ? String(event.reason) : '';
    if (
      reasonStr.includes('Failed to fetch dynamically imported module') ||
      reasonStr.includes('Importing a module script failed')
    ) {
      console.warn('Dynamic chunk import rejection detected. Reloading page...');
      window.location.reload();
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
