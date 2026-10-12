import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath } from 'node:url';
import { codexAssistantPlugin } from './assistant-server';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: '../../public',
  cacheDir: '../../.build-intent-cache',
  plugins: [react(), codexAssistantPlugin()],
  server: { host: '127.0.0.1', port: 5190 },
  build: { outDir: '../../dist-build-intent', emptyOutDir: true },
  test: { include: ['**/*.test.ts'], environment: 'node' },
});
