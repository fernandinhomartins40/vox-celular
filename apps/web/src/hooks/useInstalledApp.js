import { useSyncExternalStore } from 'react';

const query = '(display-mode: standalone), (display-mode: minimal-ui)';
function snapshot() { return window.matchMedia(query).matches || navigator.standalone === true; }
function subscribe(listener) {
  const media = window.matchMedia(query);
  media.addEventListener('change', listener);
  window.addEventListener('appinstalled', listener);
  return () => { media.removeEventListener('change', listener); window.removeEventListener('appinstalled', listener); };
}
export function useInstalledApp() { return useSyncExternalStore(subscribe, snapshot, () => false); }
