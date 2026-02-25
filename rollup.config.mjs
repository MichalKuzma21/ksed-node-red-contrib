// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';

export default {
  input: [
    'src/nodes/auth/authentication.ts',
    'src/nodes/send-invoice/send-invoice.ts',
    'src/nodes/invoices-metadata-hwm-continuous-sync/invoices-metadata-hwm-sync.ts',
    'src/nodes/invoice-visualization/invoice-visualization.ts',
    'src/nodes/refresh-token/refresh-token.ts',
    'src/nodes/download-invoice/download-invoice.ts',
    'src/nodes/init-interactive-session/init-interactive-session.ts',
    'src/nodes/close-interactive-session/close-interactive-session.ts',
  ],
  output: {
    dir: 'dist/',
    format: 'cjs'
  },
  context: 'globalThis',
  plugins: [
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' })
  ]
};
