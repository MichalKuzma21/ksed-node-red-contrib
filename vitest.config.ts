import path from 'path';
import { defineConfig } from 'vitest/config';

const ksefConverter = (subpath: string) =>
  path.resolve(`./node_modules/@akmf/ksef-fe-invoice-converter/src/lib-public/${subpath}.ts`);

export default defineConfig({
  resolve: {
    alias: {
      '@akmf/ksef-fe-invoice-converter/src/lib-public/FA1-generator':
        ksefConverter('FA1-generator'),
      '@akmf/ksef-fe-invoice-converter/src/lib-public/FA2-generator':
        ksefConverter('FA2-generator'),
      '@akmf/ksef-fe-invoice-converter/src/lib-public/FA3-generator':
        ksefConverter('FA3-generator'),
    },
  },
  test: {
    environment: 'node',
    include: ['test/unit/**/*.test.ts'],
    globals: true,
    clearMocks: true,
    server: {
      deps: {
        inline: ['@akmf/ksef-fe-invoice-converter'],
      },
    },
  },
});
