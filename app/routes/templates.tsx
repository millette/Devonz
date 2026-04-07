import { Suspense, useEffect } from 'react';
import { type MetaFunction, useRouteError, isRouteErrorResponse } from 'react-router';
import { Header } from '~/components/header/Header';
import { clientLazy } from '~/utils/react';

const TemplatesGallery = clientLazy(() => import('~/components/templates/TemplatesGallery.client'));

// ── Route metadata ──────────────────────────────────────────────────────────

export const meta: MetaFunction = () => {
  return [
    { title: 'Templates | Devonz' },
    { name: 'description', content: 'Browse curated website templates for Devonz' },
  ];
};

export const loader = () => Response.json({});

// ── Route export ────────────────────────────────────────────────────────────

export default function TemplatesRoute() {
  return (
    <main className="flex flex-col h-full w-full" style={{ backgroundColor: '#0a0a0a' }}>
      <Header />
      <Suspense fallback={null}>
        <TemplatesGallery />
      </Suspense>
    </main>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    console.error('[Devonz:TemplatesRouteError]', {
      timestamp: new Date().toISOString(),
      route: 'templates',
      ...(isRouteErrorResponse(error)
        ? { status: error.status, statusText: error.statusText, data: error.data }
        : error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : { raw: String(error) }),
    });
  }, [error]);

  const message = isRouteErrorResponse(error)
    ? error.data || 'Failed to load the templates gallery.'
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred while loading templates.';

  return (
    <main className="flex flex-col items-center justify-center h-full w-full bg-devonz-elements-background-depth-1 text-devonz-elements-textPrimary px-6">
      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <div className="i-ph:layout text-3xl text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Templates Error</h1>
        <p className="text-sm text-devonz-elements-textSecondary mb-8">{message}</p>
        <div className="flex gap-3 justify-center">
          <a
            href="/"
            className="px-5 py-2.5 rounded-lg text-sm font-medium border border-devonz-elements-borderColor bg-transparent text-devonz-elements-textPrimary hover:bg-devonz-elements-background-depth-2 transition-colors duration-200"
          >
            Go Home
          </a>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-devonz-elements-button-primary-background text-devonz-elements-button-primary-text hover:bg-devonz-elements-button-primary-backgroundHover transition-colors duration-200"
          >
            Reload
          </button>
        </div>
        {error instanceof Error && error.stack && (
          <details className="mt-8 text-left w-full">
            <summary className="cursor-pointer text-xs text-devonz-elements-textTertiary hover:text-devonz-elements-textSecondary transition-colors">
              Error Details
            </summary>
            <div className="mt-3 p-4 bg-devonz-elements-background-depth-2 border border-devonz-elements-borderColor rounded-lg overflow-auto max-h-64">
              <p className="text-xs text-red-400 font-mono font-semibold mb-2">
                {error.name}: {error.message}
              </p>
              <pre className="text-xs text-devonz-elements-textTertiary font-mono whitespace-pre-wrap break-words">
                {error.stack}
              </pre>
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
