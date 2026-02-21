import ignore from 'ignore';
import type { ProviderInfo } from '~/types/model';
import type { Template } from '~/types/template';
import { STARTER_TEMPLATES } from './constants';
import { findBestMatch } from './fuzzy-match';
import { INLINE_TEMPLATES } from './inline-templates';
import { loadShowcaseTemplates } from './showcase-templates';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('StarterTemplate');

/**
 * Known shadcn/ui peer dependencies that MUST be in package.json
 * when using shadcn/ui components. Maps package name to version.
 * These are the Radix UI primitives, icons, and utilities that shadcn/ui imports.
 */
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
};

/**
 * Universal packages that LLMs frequently import across any framework.
 * Pre-installed to avoid auto-fix loops caused by missing dependencies.
 */
const UNIVERSAL_EXTRA_PACKAGES: Record<string, string> = {
  'date-fns': '^4.1.0',
  axios: '^1.7.9',
  zod: '^3.24.1',
};

/**
 * React-specific packages that LLMs frequently import in React projects.
 * Only injected into React-family templates (React, Next, Remix, Shadcn).
 */
const REACT_EXTRA_PACKAGES: Record<string, string> = {
  'framer-motion': '^11.15.0',
  'lucide-react': '^0.460.0',
  'react-router-dom': '^7.1.1',
  zustand: '^5.0.3',
  '@tanstack/react-query': '^5.62.16',
  'react-hook-form': '^7.54.2',
  '@hookform/resolvers': '^3.9.1',
};

/**
 * Combined common packages for React-family templates.
 */
const COMMON_EXTRA_PACKAGES: Record<string, string> = {
  ...UNIVERSAL_EXTRA_PACKAGES,
  ...REACT_EXTRA_PACKAGES,
};

interface PromptTemplate {
  name: string;
  description: string;
  tags?: string[];
}

const starterTemplateSelectionPrompt = (
  starterTemplates: PromptTemplate[],
  showcaseTemplates: PromptTemplate[] = [],
) => `You pick the best starter template for a user's project. Respond ONLY with the XML selection — no explanation.

Decision rules (in priority order):
1. Trivial tasks (scripts, algorithms, simple logic) → blank
2. Specific site type (portfolio, landing page, dashboard, SaaS, e-commerce) → matching showcase template
3. React project needing UI components → Vite Shadcn (preferred) or NextJS Shadcn (if SSR/fullstack needed)
4. Vue project → Vue
5. Svelte project → Sveltekit
6. Angular project → Angular
7. Presentation/slides → Slidev
8. Mobile app → Expo App
9. Static site/blog → Basic Astro
10. Any other web project → Vite Shadcn as default

Starter templates:
<template><name>blank</name><description>Empty starter for simple scripts</description><tags>basic, script</tags></template>
${starterTemplates.map((t) => `<template><name>${t.name}</name><description>${t.description}</description>${t.tags ? `<tags>${t.tags.join(', ')}</tags>` : ''}</template>`).join('\n')}
${
  showcaseTemplates.length > 0
    ? `
Showcase templates (full pre-built projects):
${showcaseTemplates.map((t) => `<template><name>${t.name}</name><description>${t.description}</description>${t.tags ? `<tags>${t.tags.join(', ')}</tags>` : ''}</template>`).join('\n')}`
    : ''
}

Format:
<selection>
  <templateName>{name}</templateName>
  <title>{short project title}</title>
</selection>
`;

const templates: Template[] = STARTER_TEMPLATES;

const parseSelectedTemplate = (llmOutput: string): { template: string; title: string } | null => {
  try {
    // Extract content between <templateName> tags
    const templateNameMatch = llmOutput.match(/<templateName>(.*?)<\/templateName>/);
    const titleMatch = llmOutput.match(/<title>(.*?)<\/title>/);

    if (!templateNameMatch) {
      return null;
    }

    return { template: templateNameMatch[1].trim(), title: titleMatch?.[1].trim() || 'Untitled Project' };
  } catch (error) {
    logger.error('Error parsing template selection:', error);
    return null;
  }
};

export const selectStarterTemplate = async (options: { message: string; model: string; provider: ProviderInfo }) => {
  const { message, model, provider } = options;

  // Load showcase templates so the LLM can pick a specific pre-built project
  let showcasePromptTemplates: PromptTemplate[] = [];

  try {
    const showcase = await loadShowcaseTemplates();
    showcasePromptTemplates = showcase.map((st) => ({
      name: st.name,
      description: st.description,
      tags: st.tags,
    }));
  } catch {
    logger.warn('Failed to load showcase templates for selection prompt');
  }

  const requestBody = {
    message,
    model,
    provider,
    system: starterTemplateSelectionPrompt(templates, showcasePromptTemplates),
  };
  const response = await fetch('/api/llmcall', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
  const respJson: { text: string } = await response.json();
  logger.debug(respJson);

  const { text } = respJson;
  const selectedTemplate = parseSelectedTemplate(text);

  if (selectedTemplate) {
    return selectedTemplate;
  } else {
    logger.info('No template selected, using blank template');

    return {
      template: 'blank',
      title: '',
    };
  }
};

const getGitHubRepoContent = async (repoName: string): Promise<{ name: string; path: string; content: string }[]> => {
  try {
    // Instead of directly fetching from GitHub, use our own API endpoint as a proxy
    const response = await fetch(`/api/github-template?repo=${encodeURIComponent(repoName)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Our API will return the files in the format we need
    const files = (await response.json()) as Array<{ name: string; path: string; content: string }>;

    return files;
  } catch (error) {
    logger.error('Error fetching release contents:', error);
    throw error;
  }
};

/**
 * Inject missing shadcn/ui peer dependencies into a template's package.json.
 * Scans component files for @radix-ui imports and ensures those packages
 * are listed in dependencies. This prevents auto-fix loops caused by
 * missing peer deps at runtime.
 */
function injectShadcnPeerDeps(files: Array<{ name: string; path: string; content: string }>): void {
  const pkgJsonFile = files.find((f) => f.path === 'package.json' || f.name === 'package.json');

  if (!pkgJsonFile) {
    return;
  }

  try {
    const pkgJson = JSON.parse(pkgJsonFile.content);
    const deps = pkgJson.dependencies || {};
    const devDeps = pkgJson.devDependencies || {};
    const allExistingDeps = { ...deps, ...devDeps };

    // Collect all @radix-ui and other shadcn imports actually used in component files
    const usedPackages = new Set<string>();

    for (const file of files) {
      if (!file.path.endsWith('.tsx') && !file.path.endsWith('.ts')) {
        continue;
      }

      // Match import statements for known peer deps (Radix UI, utilities, and shadcn component deps)
      const importMatches = file.content.matchAll(
        /from\s+['"](@radix-ui\/[^'"]+|class-variance-authority|clsx|tailwind-merge|lucide-react|cmdk|vaul|sonner|input-otp|react-day-picker|embla-carousel-react|react-resizable-panels|recharts)['"]/g,
      );

      for (const match of importMatches) {
        usedPackages.add(match[1]);
      }
    }

    // Add missing deps that are imported but not in package.json
    let injectedCount = 0;

    for (const pkg of usedPackages) {
      if (!allExistingDeps[pkg] && SHADCN_PEER_DEPS[pkg]) {
        deps[pkg] = SHADCN_PEER_DEPS[pkg];
        injectedCount++;
      }
    }

    /*
     * Always pre-install commonly used packages that LLMs frequently import
     * (e.g. framer-motion, lucide-react) to prevent auto-fix loops
     */
    for (const [pkg, version] of Object.entries(COMMON_EXTRA_PACKAGES)) {
      if (!allExistingDeps[pkg] && !deps[pkg]) {
        deps[pkg] = version;
        injectedCount++;
      }
    }

    if (injectedCount > 0) {
      pkgJson.dependencies = deps;
      pkgJsonFile.content = JSON.stringify(pkgJson, null, 2);
      logger.info(`Injected ${injectedCount} dependencies (peer deps + common packages) into template package.json`);
    }
  } catch (error) {
    logger.error('Failed to inject shadcn peer deps:', error);
  }
}

/**
 * Inject only the common extra packages (framer-motion, lucide-react, etc.)
 * into a non-shadcn React-family template's package.json. This prevents
 * auto-fix loops when the LLM imports popular libraries that aren't in
 * the template's dependency list.
 */
function injectCommonPackages(files: Array<{ name: string; path: string; content: string }>): void {
  const pkgJsonFile = files.find((f) => f.path === 'package.json' || f.name === 'package.json');

  if (!pkgJsonFile) {
    return;
  }

  try {
    const pkgJson = JSON.parse(pkgJsonFile.content);
    const deps = pkgJson.dependencies || {};
    const devDeps = pkgJson.devDependencies || {};
    const allExistingDeps = { ...deps, ...devDeps };
    let injectedCount = 0;

    for (const [pkg, version] of Object.entries(COMMON_EXTRA_PACKAGES)) {
      if (!allExistingDeps[pkg] && !deps[pkg]) {
        deps[pkg] = version;
        injectedCount++;
      }
    }

    if (injectedCount > 0) {
      pkgJson.dependencies = deps;
      pkgJsonFile.content = JSON.stringify(pkgJson, null, 2);
      logger.info(`Injected ${injectedCount} common packages into template package.json`);
    }
  } catch (error) {
    logger.error('Failed to inject common packages:', error);
  }
}

/**
 * Inject only framework-agnostic universal packages (date-fns, axios, zod)
 * into non-React JSX templates like SolidJS and Qwik. Avoids adding
 * React-specific dependencies that would be unused and confusing.
 */
function injectUniversalPackages(files: Array<{ name: string; path: string; content: string }>): void {
  const pkgJsonFile = files.find((f) => f.path === 'package.json' || f.name === 'package.json');

  if (!pkgJsonFile) {
    return;
  }

  try {
    const pkgJson = JSON.parse(pkgJsonFile.content);
    const deps = pkgJson.dependencies || {};
    const devDeps = pkgJson.devDependencies || {};
    const allExistingDeps = { ...deps, ...devDeps };
    let injectedCount = 0;

    for (const [pkg, version] of Object.entries(UNIVERSAL_EXTRA_PACKAGES)) {
      if (!allExistingDeps[pkg] && !deps[pkg]) {
        deps[pkg] = version;
        injectedCount++;
      }
    }

    if (injectedCount > 0) {
      pkgJson.dependencies = deps;
      pkgJsonFile.content = JSON.stringify(pkgJson, null, 2);
      logger.info(`Injected ${injectedCount} universal packages into template package.json`);
    }
  } catch (error) {
    logger.error('Failed to inject universal packages:', error);
  }
}

/**
 * Frameworks whose templates should get full COMMON_EXTRA_PACKAGES
 * (React-specific + universal) injected into package.json.
 */
const REACT_TEMPLATE_KEYWORDS = ['react', 'next', 'remix', 'shadcn'];

/**
 * Returns true when `templateName` is a React-family framework.
 */
function isReactFamily(templateName: string): boolean {
  const lower = templateName.toLowerCase();
  return REACT_TEMPLATE_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function getTemplates(templateName: string, title?: string) {
  /*
   * ——— Step 1: Resolve template by name (exact → fuzzy → showcase) ———
   */
  let template: Template | undefined = STARTER_TEMPLATES.find((t) => t.name === templateName);
  let showcaseRepo: string | undefined;
  let resolvedName = templateName;

  // If no exact starter match, try fuzzy matching against starter names
  if (!template) {
    const starterNames = STARTER_TEMPLATES.map((t) => t.name);
    const fuzzyStarterMatch = findBestMatch(templateName, starterNames);

    if (fuzzyStarterMatch) {
      template = STARTER_TEMPLATES.find((t) => t.name === fuzzyStarterMatch);
      logger.info(`Fuzzy matched "${templateName}" → starter "${fuzzyStarterMatch}"`);
      resolvedName = fuzzyStarterMatch;
    }
  }

  // If still no starter match, check showcase templates (exact then fuzzy)
  if (!template) {
    try {
      const showcaseTemplates = await loadShowcaseTemplates();
      const showcaseMatch = showcaseTemplates.find((st) => st.name === templateName);

      if (showcaseMatch) {
        showcaseRepo = showcaseMatch.githubRepo;
        resolvedName = showcaseMatch.name;
      } else {
        const showcaseNames = showcaseTemplates.map((st) => st.name);
        const fuzzyShowcaseMatch = findBestMatch(templateName, showcaseNames);

        if (fuzzyShowcaseMatch) {
          const matched = showcaseTemplates.find((st) => st.name === fuzzyShowcaseMatch);

          if (matched) {
            showcaseRepo = matched.githubRepo;
            resolvedName = matched.name;
            logger.info(`Fuzzy matched "${templateName}" → showcase "${fuzzyShowcaseMatch}"`);
          }
        }
      }
    } catch {
      logger.warn('Failed to load showcase templates');
    }
  }

  if (!template && !showcaseRepo) {
    logger.warn(`No template match found for "${templateName}"`);
    return null;
  }

  /*
   * ——— Step 2: Fetch template files (inline → GitHub → fallback) ———
   */
  let files: Array<{ name: string; path: string; content: string }>;

  if (template) {
    const inlineFiles = INLINE_TEMPLATES[template.name];

    if (inlineFiles) {
      files = inlineFiles.map((f) => ({ ...f }));
      logger.info(`Using inline template for "${template.name}" (${files.length} files)`);
    } else {
      logger.info(`No inline content for "${template.name}", fetching from GitHub`);
      files = await getGitHubRepoContent(template.githubRepo);
    }
  } else {
    // Showcase template — try GitHub; on failure, fall back to closest starter
    logger.info(`Fetching showcase template from GitHub: ${showcaseRepo}`);

    try {
      files = await getGitHubRepoContent(showcaseRepo!);
    } catch (error) {
      logger.warn(`Showcase fetch failed for "${resolvedName}", falling back to closest starter`, error);

      // Find the best starter template as fallback
      const starterNames = STARTER_TEMPLATES.map((t) => t.name);
      const fallbackName = findBestMatch(resolvedName, starterNames) ?? 'Vite Shadcn';
      const fallback = STARTER_TEMPLATES.find((t) => t.name === fallbackName)!;
      const fallbackInline = INLINE_TEMPLATES[fallback.name];

      if (fallbackInline) {
        files = fallbackInline.map((f) => ({ ...f }));
        logger.info(`Falling back to inline starter "${fallback.name}" (${files.length} files)`);
      } else {
        files = await getGitHubRepoContent(fallback.githubRepo);
      }

      // Update resolved name so downstream messages reference the actual template used
      resolvedName = fallback.name;
      template = fallback;
    }
  }

  /*
   * ——— Step 3: Inject dependencies ———
   * - Shadcn templates: inject peer deps + React common + universal packages
   * - Other React-family templates: inject React common + universal packages
   * - JSX non-React (Solid, Qwik): inject universal packages only
   * - All other frameworks (Vue, Svelte, Astro, Angular, etc.): inject universal packages
   */
  if (resolvedName.toLowerCase().includes('shadcn')) {
    injectShadcnPeerDeps(files);
  } else if (isReactFamily(resolvedName)) {
    injectCommonPackages(files);
  } else {
    /*
     * All non-React templates (Vue, Svelte, Astro, Angular, Solid, Qwik, etc.)
     * get framework-agnostic universal packages (date-fns, axios, zod)
     */
    injectUniversalPackages(files);
  }

  let filteredFiles = files;

  /*
   * ignoring common unwanted files
   * exclude    .git
   */
  filteredFiles = filteredFiles.filter((x) => x.path.startsWith('.git') == false);

  /*
   * Lock files are included for faster npm install times.
   * Previously excluded, now kept intentionally.
   */

  // exclude    .devonz
  filteredFiles = filteredFiles.filter((x) => x.path.startsWith('.devonz') == false);

  // check for ignore file in .devonz folder
  const templateIgnoreFile = files.find((x) => x.path.startsWith('.devonz') && x.name == 'ignore');

  const filesToImport = {
    files: filteredFiles,
    ignoreFile: [] as typeof filteredFiles,
  };

  if (templateIgnoreFile) {
    // redacting files specified in ignore file
    const ignorepatterns = templateIgnoreFile.content.split('\n').map((x) => x.trim());
    const ig = ignore().add(ignorepatterns);

    // filteredFiles = filteredFiles.filter(x => !ig.ignores(x.path))
    const ignoredFiles = filteredFiles.filter((x) => ig.ignores(x.path));

    filesToImport.files = filteredFiles;
    filesToImport.ignoreFile = ignoredFiles;
  }

  const displayName = template?.name || resolvedName;

  const assistantMessage = `
Devonz is initializing your project with the required files using the ${displayName} template.
<devonzArtifact id="imported-files" title="${title || 'Create initial files'}" type="bundled">
${filesToImport.files
  .map(
    (file) =>
      `<devonzAction type="file" filePath="${file.path}">
${file.content}
</devonzAction>`,
  )
  .join('\n')}
<devonzAction type="shell">npm install --legacy-peer-deps</devonzAction>
<devonzAction type="start">npm run dev</devonzAction>
</devonzArtifact>
`;
  let userMessage = ``;
  const templatePromptFile = files.filter((x) => x.path.startsWith('.devonz')).find((x) => x.name == 'prompt');

  if (templatePromptFile) {
    userMessage = `
TEMPLATE INSTRUCTIONS:
${templatePromptFile.content}

---
`;
  }

  if (filesToImport.ignoreFile.length > 0) {
    userMessage =
      userMessage +
      `
STRICT FILE ACCESS RULES - READ CAREFULLY:

The following files are READ-ONLY and must never be modified:
${filesToImport.ignoreFile.map((file) => `- ${file.path}`).join('\n')}

Permitted actions:
✓ Import these files as dependencies
✓ Read from these files
✓ Reference these files

Strictly forbidden actions:
❌ Modify any content within these files
❌ Delete these files
❌ Rename these files
❌ Move these files
❌ Create new versions of these files
❌ Suggest changes to these files

Any attempt to modify these protected files will result in immediate termination of the operation.

If you need to make changes to functionality, create new files instead of modifying the protected ones listed above.
---
`;
  }

  /*
   * Dependency preservation instructions — apply to ALL templates.
   * Prevents the LLM from rewriting package.json and dropping critical deps.
   */
  const pkgFile = files.find((f) => f.path === 'package.json' || f.name === 'package.json');

  if (pkgFile) {
    try {
      const pkgJson = JSON.parse(pkgFile.content);
      const depCount = Object.keys(pkgJson.dependencies || {}).length;

      // Detect Tailwind CSS version from devDependencies
      const tailwindVersion = pkgJson.devDependencies?.tailwindcss || '';
      const isTailwindV3 =
        tailwindVersion.startsWith('^3') || tailwindVersion.startsWith('~3') || tailwindVersion.startsWith('3');

      userMessage += `
⚠️ DEPENDENCY RULES:
- ${depCount} pre-configured dependencies exist. NEVER rewrite package.json from scratch.
- Only ADD new dependencies — keep ALL existing ones.
- If you import a new npm package in code, add it to package.json dependencies FIRST.
${resolvedName.toLowerCase().includes('shadcn') ? `- Shadcn/ui template: Radix UI primitives and peer deps are MANDATORY.\n` : ''}${isTailwindV3 ? `- Tailwind CSS v3 syntax: \`@tailwind base; @tailwind components; @tailwind utilities;\` — NOT \`@import "tailwindcss";\`.\n` : ''}`;
    } catch {
      // Failed to parse package.json, skip dep preservation instructions
    }
  }

  userMessage += `
Template "${displayName}" imported. Dependencies install automatically.

RULES:
1. Edit only the files you need — do NOT rewrite files unnecessarily or create duplicate structures.
2. Preserve existing imports, exports, and functionality when editing files.
3. Do NOT run \`npm install\` or \`npm run dev\` — both happen automatically.
4. Follow the template's existing directory structure and patterns.
5. Use TypeScript (.tsx/.ts) for new files unless the template uses plain JS.
`;

  return {
    assistantMessage,
    userMessage,
  };
}
