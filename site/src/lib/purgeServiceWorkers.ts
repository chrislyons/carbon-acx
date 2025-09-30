const DEBUG_STORAGE_KEY = 'acx:debug:purge-sw';
const PURGE_STATE_KEY = 'acx:sw-purge:v20240501';

function debugFlagEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (import.meta.env.VITE_DEBUG_PURGE_SERVICE_WORKERS === 'true') {
    return true;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('purge-sw') === '1') {
      window.localStorage.setItem(DEBUG_STORAGE_KEY, '1');
      return true;
    }
    return window.localStorage.getItem(DEBUG_STORAGE_KEY) === '1';
  } catch (error) {
    console.warn('[acx] Unable to evaluate service worker purge flag', error);
    return false;
  }
}

export function purgeStaleServiceWorkersOnce(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const shouldPurge = debugFlagEnabled();
  if (!shouldPurge) {
    return;
  }

  let alreadyPurged = false;
  try {
    alreadyPurged = window.localStorage.getItem(PURGE_STATE_KEY) === 'done';
  } catch (error) {
    console.warn('[acx] Unable to read purge state', error);
  }

  if (alreadyPurged) {
    return;
  }

  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .then(() => {
      try {
        window.localStorage.setItem(PURGE_STATE_KEY, 'done');
      } catch (error) {
        console.warn('[acx] Unable to persist purge state', error);
      }
    })
    .catch((error) => {
      console.warn('[acx] Failed to purge service workers', error);
    });
}
