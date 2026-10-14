import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function validateFirebaseClientConfiguration(encoded) {
  if (typeof encoded !== 'string' || encoded.length > 131072 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('Invalid Firebase client configuration');
  let config;
  try { config = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')); } catch { throw new Error('Invalid Firebase client configuration'); }
  if (!config || config.type === 'service_account' || config.private_key || config.client_email) throw new Error('Use the Android client configuration, never a service-account key');
  const client = Array.isArray(config.client) ? config.client.find(item => item?.client_info?.android_client_info?.package_name === 'br.com.voxcelular.cliente') : undefined;
  if (!client || !/^[0-9]{1,30}$/.test(config.project_info?.project_number || '') || typeof config.project_info?.project_id !== 'string' || !Array.isArray(client.api_key) || !client.api_key.some(item => typeof item?.current_key === 'string' && item.current_key.length > 10)) throw new Error('Firebase configuration does not match the Vox Android application');
  return JSON.stringify(config);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const encoded = process.env.VOX_ANDROID_GOOGLE_SERVICES_JSON_BASE64;
  if (!encoded) console.log('Firebase client configuration absent: APK remains available for tests without native push.');
  else {
    const config = validateFirebaseClientConfiguration(encoded);
    const target = new URL('../../apps/mobile/.native-config/google-services.json', import.meta.url);
    await mkdir(new URL('.', target), { recursive: true });
    await writeFile(target, config, { mode: 0o600 });
    console.log('Android Firebase client configuration prepared without logging its contents.');
  }
}
