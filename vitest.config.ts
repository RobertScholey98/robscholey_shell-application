import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      // Longest-path first — Vite's alias resolver uses the first matching
      // entry, so `shell-kit/ui` has to come before the bare `shell-kit`
      // prefix or the former would silently collapse to `<path>/index.ts/ui`.
      {
        find: '@robscholey/shell-kit/ui',
        replacement: path.resolve(__dirname, '../robscholey_shell-kit/src/ui/index.ts'),
      },
      {
        find: '@robscholey/shell-kit',
        replacement: path.resolve(__dirname, '../robscholey_shell-kit/src/index.ts'),
      },
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
