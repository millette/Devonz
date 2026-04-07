import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'app/routes/**/*.{ts,tsx}',
    'scripts/**/*.{js,mjs,cjs}',
    'e2e/**/*.spec.ts',
    'server.ts',
    // Internal library modules — exports form public API surfaces
    'app/lib/**/*.ts',
    'app/types/**/*.ts',
    'app/utils/**/*.ts',
  ],
  project: ['app/**/*.{ts,tsx}', '*.{ts,mjs,cjs,js}'],
  ignoreDependencies: [
    // UnoCSS icon presets loaded dynamically by UnoCSS
    '@iconify-json/ph',
    '@iconify-json/svg-spinners',
    '@iconify-json/vscode-icons',
    '@iconify/types',
    // Peer/implicit dependencies
    '@vitejs/plugin-react',
    // Used in Docker / CI
    'pnpm',
  ],
  ignoreBinaries: ['eslint'],
  // Remix exports (loader, action, meta, links, headers, handle, ErrorBoundary,
  // HydrateFallback, shouldRevalidate) are consumed by the framework at runtime,
  // not by direct in-project imports. Tell Knip to ignore them.
  ignoreExportsUsedInFile: true,
  // Enforce error-level severity for dead-code detection
  rules: {
    files: 'error',
    dependencies: 'error',
    unlisted: 'error',
    exports: 'error',
    devDependencies: 'warn',
    types: 'warn',
    duplicates: 'warn',
    binaries: 'warn',
  },
  // Plugin configuration
  vitest: { config: ['vitest.config.ts'] },
  playwright: { config: ['playwright.config.ts'] },
  eslint: { config: ['eslint.config.mjs'] },
};

export default config;
