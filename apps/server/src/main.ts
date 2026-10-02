import { runtimeFor } from '../../../packages/product-packs/runtimes.js';
import { loadProductPack } from '../../../packages/product-packs/loader.js';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
const staticDir = fileURLToPath(new URL('../../../web/', import.meta.url));
const defaultPack = fileURLToPath(new URL('../../../packages/product-packs/acme/pack.json', import.meta.url));
const pack = await loadProductPack(process.env.GDE_PRODUCT_PACK_PATH ?? defaultPack);
const { server } = createApp({ staticDir, pack, runtime: runtimeFor(pack) });
server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(`GDE server could not listen (${error.code ?? 'unknown'}). Check the port and local networking permissions.`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`GDE backend: http://127.0.0.1:${port}`));
function stop() { server.close(() => process.exit(0)); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
