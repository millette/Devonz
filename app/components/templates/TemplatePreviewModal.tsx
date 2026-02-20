import React, { useEffect, useRef } from 'react';
import { useNavigate } from '@remix-run/react';
import type { ShowcaseTemplate } from '~/types/showcase-template';

interface TemplatePreviewModalProps {
  template: ShowcaseTemplate | null;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  'landing-page': 'Landing Page',
  portfolio: 'Portfolio',
  'online-store': 'Online Store',
  dashboard: 'Dashboard',
  saas: 'SaaS',
  'ai-app': 'AI App',
};

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({ template, onClose }) => {
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!template) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const handlePreview = () => {
    window.open(template.vercelUrl, '_blank', 'noopener,noreferrer');
  };

  const handleUseTemplate = () => {
    const gitUrl = `https://github.com/${template.githubRepo}.git`;
    navigate(`/git?url=${encodeURIComponent(gitUrl)}`);
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #333333' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`${template.icon} text-xl text-cyan-400 flex-shrink-0`} />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white truncate">{template.name}</h2>
              <p className="text-sm text-[#9ca3af]">{CATEGORY_LABELS[template.category] || template.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors flex-shrink-0"
            style={{ backgroundColor: '#2a2a2a' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#333333';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2a2a2a';
            }}
          >
            <div className="i-ph:x text-lg text-[#9ca3af]" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
          <iframe
            src={template.vercelUrl}
            title={`${template.name} preview`}
            className="w-full h-full border-none"
            style={{ minHeight: '400px' }}
            sandbox="allow-scripts allow-same-origin allow-popups"
            loading="lazy"
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #333333', backgroundColor: '#141414' }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-[#9ca3af] mr-2 hidden sm:block">{template.description}</p>
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded-full text-[#9ca3af]"
                style={{ backgroundColor: '#2a2a2a' }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={handlePreview}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#2a2a2a', color: '#ffffff', border: '1px solid #333333' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#333333';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2a2a2a';
              }}
            >
              <div className="i-ph:eye text-base" />
              Preview
            </button>
            <button
              onClick={handleUseTemplate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              <div className="i-ph:code text-base" />
              Use Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
