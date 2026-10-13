export function assertDisposableDatabase(mode: string | undefined, environment = process.env) {
  if (mode !== 'ci-disposable' || environment.CI !== 'true') throw new Error('DISPOSABLE_CI_REQUIRED');
  let url: URL;
  try { url = new URL(environment.DATABASE_URL || ''); } catch { throw new Error('DISPOSABLE_DATABASE_REQUIRED'); }
  if (url.protocol !== 'postgresql:' || url.hostname !== 'db' || url.port !== '5432' || url.pathname !== '/voxcelular' || url.username !== 'vox' || url.password !== 'ci-only-password') throw new Error('DISPOSABLE_DATABASE_REQUIRED');
}
