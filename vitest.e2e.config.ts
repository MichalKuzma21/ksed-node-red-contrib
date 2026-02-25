import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 60_000, // For E2E testing
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      all: true,
      exclude: [
        '**/dist/**',
        '**/node_modules/**',
        'node-red-contrib-ksef/dist/*',
        // tests
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test/**',

        // auto-generated
        '**/*.gen.ts',
        '**/hey-api-generated-*/**',

        // config
        '**/vite.config.*',
        '**/rollup.config.*',

        'test-certificates/*',
        // test utils
        '**/node-red-effect-runner.ts',
        'node-red-contrib-ksef/test/e2e/utils/*',
      ],
    },
    include: ['test/e2e/000_run_test_in_order.test.ts'],
    bail: 1,
    deps: {
      inline: ['effect/index'],
    },
  },
});
