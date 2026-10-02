import { readFile } from 'node:fs/promises';
import { ProductPackSchema, type ProductPack } from '../contracts/src/product-pack.js';

// Trusted local file path supplied by server configuration, never by an HTTP caller.
// JSON is data, not code: a Pack cannot import modules or execute a handler here.
export async function loadProductPack(path: string): Promise<ProductPack> {
  return ProductPackSchema.parse(JSON.parse(await readFile(path, 'utf8')));
}
