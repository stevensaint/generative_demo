import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: {
    host: '127.0.0.1', port: Number(process.env.WEB_PORT ?? 5173), strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${process.env.PORT ?? 3001}` },
  },
  build: { outDir: '../../dist/web', emptyOutDir: true },
});
