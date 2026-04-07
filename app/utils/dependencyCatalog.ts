const SHADCN_PEER_DEPS: Record<string, string> = {
  '@radix-ui/react-icons': '^1.3.2',
  '@radix-ui/react-slot': '^1.1.0',
  '@radix-ui/react-label': '^2.1.0',
  '@radix-ui/react-dialog': '^1.1.2',
  '@radix-ui/react-select': '^2.1.2',
  '@radix-ui/react-tabs': '^1.1.1',
  '@radix-ui/react-separator': '^1.1.0',
  '@radix-ui/react-scroll-area': '^1.2.0',
  '@radix-ui/react-avatar': '^1.1.1',
  '@radix-ui/react-checkbox': '^1.1.2',
  '@radix-ui/react-switch': '^1.1.1',
  '@radix-ui/react-toggle': '^1.1.0',
  '@radix-ui/react-toggle-group': '^1.1.0',
  '@radix-ui/react-tooltip': '^1.1.3',
  '@radix-ui/react-popover': '^1.1.2',
  '@radix-ui/react-dropdown-menu': '^2.1.2',
  '@radix-ui/react-context-menu': '^2.2.2',
  '@radix-ui/react-accordion': '^1.2.1',
  '@radix-ui/react-alert-dialog': '^1.1.2',
  '@radix-ui/react-aspect-ratio': '^1.1.0',
  '@radix-ui/react-collapsible': '^1.1.1',
  '@radix-ui/react-hover-card': '^1.1.2',
  '@radix-ui/react-menubar': '^1.1.2',
  '@radix-ui/react-navigation-menu': '^1.2.1',
  '@radix-ui/react-progress': '^1.1.0',
  '@radix-ui/react-radio-group': '^1.2.1',
  '@radix-ui/react-slider': '^1.2.1',
  '@radix-ui/react-toast': '^1.2.2',
  'class-variance-authority': '^0.7.0',
  clsx: '^2.1.1',
  'tailwind-merge': '^2.5.4',
  'lucide-react': '^0.460.0',
  cmdk: '^1.0.0',
  vaul: '^1.1.0',
  sonner: '^1.7.0',
  'input-otp': '^1.4.1',
  'react-day-picker': '^9.4.4',
  'embla-carousel-react': '^8.5.1',
  'react-resizable-panels': '^2.1.7',
  recharts: '^2.15.0',
  'tailwindcss-animate': '^1.0.7',
};

const UNIVERSAL_EXTRA_PACKAGES: Record<string, string> = {
  'date-fns': '^4.1.0',
  axios: '^1.7.9',
  zod: '^3.24.1',
  nanoid: '^5.1.5',
  clsx: '^2.1.1',
  'tailwind-merge': '^2.5.4',
};

const REACT_EXTRA_PACKAGES: Record<string, string> = {
  'framer-motion': '^11.15.0',
  'lucide-react': '^0.460.0',
  'react-router-dom': '^7.1.1',
  zustand: '^5.0.3',
  immer: '^10.1.1',
  '@tanstack/react-query': '^5.62.16',
  'react-hook-form': '^7.54.2',
  '@hookform/resolvers': '^3.9.1',
  sonner: '^1.7.0',
  'class-variance-authority': '^0.7.0',
  recharts: '^2.15.0',
};

const REACT_RUNTIME_EXTRA_PACKAGES: Record<string, string> = {
  '@dnd-kit/core': '^6.3.1',
  '@dnd-kit/sortable': '^10.0.0',
  '@dnd-kit/utilities': '^3.2.2',
  three: '^0.183.0',
  '@react-three/fiber': '^9.5.0',
  '@react-three/drei': '^10.7.7',
  'react-error-boundary': '^5.0.0',
  'react-dnd': '^16.0.1',
  'react-dnd-html5-backend': '^16.0.1',
  'react-chartjs-2': '^5.3.0',
  'chart.js': '^4.4.7',
};

const COMMON_EXTRA_PACKAGES: Record<string, string> = {
  ...UNIVERSAL_EXTRA_PACKAGES,
  ...REACT_EXTRA_PACKAGES,
};

const VUE_EXTRA_PACKAGES: Record<string, string> = {
  pinia: '^3.0.1',
  '@vueuse/core': '^12.5.0',
  'vue-router': '^4.5.0',
  'lucide-vue-next': '^0.460.0',
};

const VUE_COMBINED_PACKAGES: Record<string, string> = {
  ...UNIVERSAL_EXTRA_PACKAGES,
  ...VUE_EXTRA_PACKAGES,
};

const SVELTE_EXTRA_PACKAGES: Record<string, string> = {
  'svelte-sonner': '^0.3.28',
  'bits-ui': '^1.0.0-next.72',
};

const SVELTE_COMBINED_PACKAGES: Record<string, string> = {
  ...UNIVERSAL_EXTRA_PACKAGES,
  ...SVELTE_EXTRA_PACKAGES,
};

const SOLIDJS_EXTRA_PACKAGES: Record<string, string> = {
  '@solidjs/router': '^0.15.3',
};

const SOLIDJS_COMBINED_PACKAGES: Record<string, string> = {
  ...UNIVERSAL_EXTRA_PACKAGES,
  ...SOLIDJS_EXTRA_PACKAGES,
};

const ANGULAR_EXTRA_PACKAGES: Record<string, string> = {
  '@angular/cdk': '^19.0.0',
};

const ANGULAR_COMBINED_PACKAGES: Record<string, string> = {
  ...UNIVERSAL_EXTRA_PACKAGES,
  ...ANGULAR_EXTRA_PACKAGES,
};

const AUTO_INSTALLABLE_PACKAGE_VERSIONS: Record<string, string> = {
  ...SHADCN_PEER_DEPS,
  ...COMMON_EXTRA_PACKAGES,
  ...VUE_COMBINED_PACKAGES,
  ...SVELTE_COMBINED_PACKAGES,
  ...SOLIDJS_COMBINED_PACKAGES,
  ...ANGULAR_COMBINED_PACKAGES,
  ...REACT_RUNTIME_EXTRA_PACKAGES,
};

export {
  SHADCN_PEER_DEPS,
  UNIVERSAL_EXTRA_PACKAGES,
  REACT_EXTRA_PACKAGES,
  COMMON_EXTRA_PACKAGES,
  VUE_EXTRA_PACKAGES,
  VUE_COMBINED_PACKAGES,
  SVELTE_EXTRA_PACKAGES,
  SVELTE_COMBINED_PACKAGES,
  SOLIDJS_EXTRA_PACKAGES,
  SOLIDJS_COMBINED_PACKAGES,
  ANGULAR_EXTRA_PACKAGES,
  ANGULAR_COMBINED_PACKAGES,
  AUTO_INSTALLABLE_PACKAGE_VERSIONS,
};

export function getPreferredPackageVersion(packageName: string): string | undefined {
  return AUTO_INSTALLABLE_PACKAGE_VERSIONS[packageName];
}

export function buildMissingPackageFixInstructions(packageName: string, sourceFile?: string): string {
  const preferredVersion = getPreferredPackageVersion(packageName);
  const location = sourceFile ? ` in \`${sourceFile}\`` : '';

  if (preferredVersion) {
    return [
      `**Root Cause**: The npm package \`${packageName}\` is imported${location} but is not installed.`,
      '',
      '**Required Fix** (do ALL three steps):',
      `1. Add \`"${packageName}": "${preferredVersion}"\` to \`package.json\` using a file action`,
      '2. Run `npm install --legacy-peer-deps` as a shell action',
      '3. Run `npm run dev` as a start action to restart the dev server',
      '',
      '**CRITICAL**: Do NOT rewrite package.json from scratch — only ADD the missing package.',
      '**CRITICAL**: Never use a moving dist-tag for dependency fixes — use the vetted semver range above.',
    ].join('\n');
  }

  return [
    `**Root Cause**: The npm package \`${packageName}\` is imported${location} but is not installed.`,
    '',
    '**Required Fix**:',
    `1. Verify that \`${packageName}\` is a real, current npm package before editing \`package.json\``,
    '2. If the package name is outdated or hallucinated, replace the import with the correct modern package or an existing project dependency',
    '3. Only after verification, add the exact package/version to `package.json` (NEVER `"latest"`)',
    '4. Run `npm install --legacy-peer-deps` as a shell action',
    '5. Run `npm run dev` as a start action to restart the dev server',
    '',
    '**CRITICAL**: Do NOT assume the import is correct if the package name looks unfamiliar or old — validate the package first.',
    '**CRITICAL**: Do NOT rewrite package.json from scratch — only ADD the verified package if it is truly required.',
  ].join('\n');
}
