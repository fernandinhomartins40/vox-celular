import { createHash } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

export class AttemptWindow {
  private entries = new Map<string, { count: number; expires: number }>();
  constructor(private maximum: number, private duration: number, private capacity = 2000) {}
  consume(key: string, now = Date.now()): number {
    for (const [id, entry] of this.entries) if (entry.expires <= now) this.entries.delete(id);
    let entry = this.entries.get(key);
    if (!entry) {
      // Fail closed without evicting active limits or growing memory unbounded.
      if (this.entries.size >= this.capacity) return Math.ceil(this.duration / 1000);
      entry = { count: 0, expires: now + this.duration }; this.entries.set(key, entry);
    }
    if (entry.count >= this.maximum) return Math.max(1, Math.ceil((entry.expires - now) / 1000));
    entry.count++; return 0;
  }
}
const accounts = new AttemptWindow(40, 5 * 60000);
const total = new AttemptWindow(300, 60000, 1);
export function authLimits(req: Request, res: Response, next: NextFunction) {
  const identity = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 320)
    : req.headers.authorization?.slice(0, 4096) || req.headers.cookie?.slice(0, 4096)
      || (typeof req.body?.refreshToken === 'string' ? req.body.refreshToken.slice(0, 128) : 'anonymous');
  const key = createHash('sha256').update(`${req.originalUrl.split('?')[0]}:${identity}`).digest('hex');
  const wait = total.consume('all') || accounts.consume(key);
  if (wait) {
    res.set('Retry-After', String(wait));
    res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }); return;
  }
  next();
}
