import { createHash } from 'node:crypto';
export class AiSelectionCache {
  private entries = new Map<string, { ids: string[]; expires: number }>();
  constructor(private capacity = 100, private ttlMs = 300000) {}
  key(input: unknown) { return createHash('sha256').update(JSON.stringify(input)).digest('hex'); }
  get(key: string, now = Date.now()) {
    const row = this.entries.get(key);
    if (!row) return null;
    if (row.expires <= now) { this.entries.delete(key); return null; }
    return [...row.ids];
  }
  set(key: string, ids: string[], now = Date.now()) {
    if (!ids.length || ids.length > 3 || ids.some(id => typeof id !== 'string' || id.length > 100)) throw new Error('AI_CACHE_INVALID');
    for (const [existing, row] of this.entries) if (row.expires <= now) this.entries.delete(existing);
    this.entries.delete(key);
    while (this.entries.size >= this.capacity) this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key, { ids: [...ids], expires: now + this.ttlMs });
  }
}
