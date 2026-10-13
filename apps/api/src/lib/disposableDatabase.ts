export function assertDisposableDatabase(mode: string | undefined, environment = process.env) {
  const local = mode === 'local-disposable' && environment.LOCAL_DISPOSABLE_DATABASE === 'vox-local-postgres';
  if ((!local && mode !== 'ci-disposable') || environment.CI !== 'true') throw new Error('DISPOSABLE_CI_REQUIRED');
  let url: URL;
  try { url = new URL(environment.DATABASE_URL || ''); } catch { throw new Error('DISPOSABLE_DATABASE_REQUIRED'); }
  const address = local ? url.hostname === '127.0.0.1' && url.port === '54329' : url.hostname === 'db' && url.port === '5432';
  if (url.protocol !== 'postgresql:' || !address || url.pathname !== '/voxcelular' || url.username !== 'vox' || url.password !== 'ci-only-password') throw new Error('DISPOSABLE_DATABASE_REQUIRED');
}
