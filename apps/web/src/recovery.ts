import { z } from 'zod';
const PointerSchema = z.object({ sessionId: z.string().uuid(), accessToken: z.string().uuid() }).strict();
const key = 'gde.session.v1';
export function readPointer(storage: Pick<Storage, 'getItem' | 'removeItem'>) {
  try { const raw = storage.getItem(key); return raw ? PointerSchema.parse(JSON.parse(raw)) : null; }
  catch { storage.removeItem(key); return null; }
}
export function savePointer(storage: Pick<Storage, 'setItem'>, pointer: z.infer<typeof PointerSchema>) { storage.setItem(key, JSON.stringify(PointerSchema.parse(pointer))); }
export function clearPointer(storage: Pick<Storage, 'removeItem'>) { storage.removeItem(key); }
