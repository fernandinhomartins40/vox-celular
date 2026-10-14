import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { randomUUID } from 'expo-crypto';
import { requestForSession, sessionRevision } from './api';

let running = false;
export async function shareAccountExport(revision: number, active: () => boolean) {
  if (running) throw new Error('Aguarde a exportação atual.');
  const assertActive = () => {
    if (!active() || sessionRevision() !== revision) throw new Error('Sua sessão mudou. Abra novamente a página de privacidade.');
  };
  running = true;
  let file: File | undefined;
  try {
    assertActive();
    if (!await Sharing.isAvailableAsync()) throw new Error('O compartilhamento não está disponível neste aparelho. Exporte seus dados pela área do cliente no site.');
    assertActive();
    const data = await requestForSession<Record<string, unknown>>(revision, '/privacidade/exportar');
    assertActive();
    if (!data || typeof data.exportadoEm !== 'string' || !data.perfil) throw new Error('Não foi possível gerar o arquivo completo. Tente novamente.');
    file = new File(Paths.cache, `vox-meus-dados-${randomUUID()}.json`);
    file.write(JSON.stringify(data));
    assertActive();
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Salvar meus dados da Vox' });
  } finally {
    try { if (file?.exists) file.delete(); }
    finally { running = false; }
  }
}
