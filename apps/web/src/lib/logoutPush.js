export async function waitForLogout(request, timeout = 10000) {
  let timer;
  try {
    return await Promise.race([request, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Servidor indisponível durante a saída.')), timeout); })]);
  } finally { clearTimeout(timer); }
}

export async function captureLogoutPush(generation, readGeneration, browser = globalThis, timeout = 2000) {
  let timer;
  try {
    const captured = (async () => {
      if (readGeneration() !== generation || !browser.navigator?.serviceWorker) return null;
      const registration = await browser.navigator.serviceWorker.getRegistration('/');
      if (readGeneration() !== generation) return null;
      const subscription = await registration?.pushManager?.getSubscription();
      if (readGeneration() !== generation || !subscription) return null;
      const endpoint = subscription.endpoint;
      if (typeof endpoint !== 'string' || endpoint.length > 2048) return null;
      const url = new URL(endpoint);
      if (url.protocol !== 'https:') return null;
      return subscription;
    })().catch(() => null);
    return await Promise.race([captured, new Promise(resolve => { timer = setTimeout(() => resolve(null), timeout); })]);
  } finally { clearTimeout(timer); }
}
