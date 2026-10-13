export async function disableBrowserPush(api, generation, readGeneration, browser = globalThis) {
  const assertSession = () => { if (readGeneration() !== generation) throw new Error('A sessão mudou. Tente novamente.'); };
  assertSession();
  if (!browser.navigator?.serviceWorker) throw new Error('Este navegador não oferece notificações.');
  const registration = await browser.navigator.serviceWorker.getRegistration('/');
  assertSession();
  const subscription = await registration?.pushManager?.getSubscription();
  assertSession();
  if (!subscription) return;
  await api.post('/push/web/remover-atual', { endpoint: subscription.endpoint });
  assertSession();
  if (!await subscription.unsubscribe()) throw new Error('Cadastro removido do servidor. O navegador não confirmou a remoção; tente novamente.');
  assertSession();
}

export async function prepareBrowserPush(api, generation, readGeneration, browser = globalThis) {
  const assertSession = () => {
    if (readGeneration() !== generation) throw new Error('A sessão mudou. Prepare as notificações novamente.');
  };
  assertSession();
  if (!browser.isSecureContext || !browser.Notification || !browser.PushManager || !browser.navigator?.serviceWorker) throw new Error('Este navegador não suporta notificações aqui. No iPhone, use a aplicação adicionada à Tela de Início.');
  if (browser.Notification.permission === 'denied') throw new Error('Notificações bloqueadas. Altere a permissão nas configurações do navegador.');
  const preferences = await api.get('/privacidade/preferencias');
  assertSession();
  if (!preferences.notificacoes) throw new Error('Marque “Quero receber avisos da Vox” e salve as preferências acima.');
  const config = await api.get('/push/config');
  assertSession();
  if (!config.entregaConfigurada) throw new Error('Notificações do aparelho ainda não estão disponíveis. Seus avisos continuam na sua conta.');
  if (!/^[A-Za-z0-9_-]{87}$/.test(config.publicKey)) throw new Error('Configuração de notificações inválida. Tente novamente mais tarde.');
  const bytes = browser.atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/') + '=');
  const key = Uint8Array.from(bytes, char => char.charCodeAt(0));
  const registration = await browser.navigator.serviceWorker.getRegistration('/');
  assertSession();
  if (!registration?.active || !registration.pushManager?.subscribe) throw new Error('Recarregue esta página para preparar as notificações.');
  return {
    // Called directly by the click handler: permission request preserves the user gesture.
    activate() {
      assertSession();
      const permission = browser.Notification.permission === 'granted' ? Promise.resolve('granted') : browser.Notification.requestPermission();
      return (async () => {
        let subscription;
        let created = false;
        try {
          if (await permission !== 'granted') throw new Error('Permissão não concedida. Você pode continuar usando a aplicação normalmente.');
          assertSession();
          subscription = await registration.pushManager.getSubscription();
          assertSession();
          const previousKey = subscription?.options?.applicationServerKey;
          if (previousKey) {
            const previous = new Uint8Array(previousKey);
            if (previous.length !== key.length || previous.some((value, index) => value !== key[index])) throw new Error('Este navegador tem uma assinatura antiga. Remova a permissão da Vox nas configurações do navegador e prepare novamente.');
          }
          if (!subscription) {
            subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
            created = true;
          }
          assertSession();
          const json = subscription.toJSON();
          const saved = await api.put('/push/web', { endpoint: json.endpoint, keys: json.keys });
          assertSession();
          return saved;
        } catch (error) {
          if (created && subscription) await subscription.unsubscribe().catch(() => {});
          throw error;
        }
      })();
    },
  };
}
