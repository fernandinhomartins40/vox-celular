export const mobileLinkPaths = ['/produto', '/assistente', '/novidades', '/area-cliente', '/area-cliente/pedidos', '/area-cliente/servicos', '/area-cliente/beneficios', '/area-cliente/avisos', '/area-cliente/favoritos'];
const packageName = 'br.com.voxcelular.cliente';
export function androidAssociation(raw: string | undefined) {
  if (!raw) return [];
  const fingerprints = [...new Set(raw.split(',').map(value => value.trim().toUpperCase()))];
  if (fingerprints.length > 5 || fingerprints.some(value => !/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(value))) throw new Error('Invalid Android signing fingerprints');
  return [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints } }];
}
export function appleAssociation(teamId: string | undefined) {
  if (teamId && !/^[A-Z0-9]{10}$/.test(teamId)) throw new Error('Invalid Apple team identifier');
  return { applinks: { apps: [], details: teamId ? [{ appID: `${teamId}.${packageName}`, paths: mobileLinkPaths }] : [] } };
}
