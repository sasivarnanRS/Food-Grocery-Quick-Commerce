import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      '@quickcommerce/shared-types': path.resolve(__dirname, 'packages/shared-types/src'),
      '@quickcommerce/event-schemas': path.resolve(__dirname, 'packages/event-schemas/src'),
      '@quickcommerce/shared-utils': path.resolve(__dirname, 'packages/shared-utils/src'),
      '@quickcommerce/database': path.resolve(__dirname, 'packages/database/src'),
    },
  },
});
