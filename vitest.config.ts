import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@robscholey/shell-kit': path.resolve(__dirname, '../robscholey_shell-kit/src/index.ts'),
      '@robscholey/shell-kit/ui': path.resolve(__dirname, '../robscholey_shell-kit/src/ui/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
