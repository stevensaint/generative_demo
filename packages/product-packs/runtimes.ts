import type { ProductPack } from '../contracts/src/product-pack.js';
import type { PackRuntime } from '../contracts/src/runtime.js';
import { acmeRuntime } from './acme/runtime.js';

// Explicit trusted registry; a JSON path cannot select arbitrary executable code.
export function runtimeFor(pack: ProductPack): PackRuntime | undefined {
  return pack.metadata.packId === 'acme-quality-cloud' && pack.policy.execution === 'deterministic' ? acmeRuntime : undefined;
}
