import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist/packages/product-packs/acme', { recursive: true });
await cp('packages/product-packs/acme/pack.json', 'dist/packages/product-packs/acme/pack.json');
