import type { AccountTokenPurpose } from './accountToken.js';

// Fixed application origin: never derive a security link from a request Host header.
export function accountMail(origin: string, lojaId: string, token: string, purpose: AccountTokenPurpose) {
  const base = new URL(origin);
  if (base.protocol !== 'https:' || base.username || base.password || base.port || base.pathname !== '/' || base.search || base.hash) throw new Error('Invalid account mail origin');
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(lojaId) || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Invalid account mail link');
  if (purpose !== 'RECUPERAR_SENHA' && purpose !== 'VERIFICAR_EMAIL') throw new Error('Invalid account mail purpose');
  const verify = purpose === 'VERIFICAR_EMAIL';
  const link = new URL('/confirmar-conta', base);
  link.hash = new URLSearchParams({ lojaId, token, acao: verify ? 'verificar-email' : 'recuperar-senha' }).toString();
  return {
    subject: verify ? 'Vox Celular: confirme seu e-mail' : 'Vox Celular: recupere sua senha',
    text: `${verify ? 'Confirme seu e-mail' : 'Escolha uma nova senha'} pelo link abaixo. Ele vale por 20 minutos e só pode ser usado uma vez.\n\n${link.href}\n\nSe você não solicitou esta mensagem, ignore-a. Nunca compartilhe este link. A Vox não pede sua senha por mensagem.`,
  };
}
