/// <reference types="vitest/globals" />
import { buildMissingPackageFixInstructions, getPreferredPackageVersion } from './dependencyCatalog';

describe('dependencyCatalog', () => {
  it('returns a curated version for vetted packages', () => {
    expect(getPreferredPackageVersion('framer-motion')).toBe('^11.15.0');
    expect(getPreferredPackageVersion('@radix-ui/react-dialog')).toBe('^1.1.2');
  });

  it('returns undefined for unverified packages', () => {
    expect(getPreferredPackageVersion('totally-made-up-package')).toBeUndefined();
  });

  it('builds known-package instructions without latest', () => {
    const instructions = buildMissingPackageFixInstructions('framer-motion', 'src/App.tsx');

    expect(instructions).toContain('"framer-motion": "^11.15.0"');
    expect(instructions).toContain('src/App.tsx');
    expect(instructions).not.toContain('"latest"');
  });

  it('requires verification for unknown packages', () => {
    const instructions = buildMissingPackageFixInstructions('totally-made-up-package');

    expect(instructions).toContain('Verify that `totally-made-up-package` is a real, current npm package');
    expect(instructions).toContain('NEVER `"latest"`');
  });
});
