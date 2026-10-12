import { z } from 'zod';
export const newPasswordSchema = z.string().min(12).max(72).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Use uma senha menor: letras acentuadas e emojis ocupam mais espaço.');
