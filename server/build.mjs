// Bundles the server, including the quick-add contract it shares with the
// app, into one file so the runtime image needs no node_modules.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.mjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  // ws optionally loads native addons; it works without them.
  external: ['bufferutil', 'utf-8-validate'],
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
