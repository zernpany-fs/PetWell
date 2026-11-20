import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC keeps decorator metadata, which NestJS dependency injection needs.
  plugins: [swc.vite()],
  resolve: {
    // Same alias as tsconfig.json: '@/x' -> 'src/x'
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    // D47: load .env.test and refuse to run against any DB but petwell_test.
    setupFiles: ['./test/setup-env.ts'],
    // Integration test files each empty the shared petwell_test database,
    // so test files must run one after another, not in parallel.
    fileParallelism: false,
  },
});
