import React from 'react';
import type { ShowcaseTemplate } from '~/types/showcase-template';

interface TemplateCardProps {
  template: ShowcaseTemplate;
  onClick: (template: ShowcaseTemplate) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'landing-page': 'text-cyan-400',
  portfolio: 'text-indigo-400',
  'online-store': 'text-green-400',
  dashboard: 'text-orange-400',
  saas: 'text-purple-400',
  'ai-app': 'text-pink-400',
};

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, onClick }) => {
  const iconColor = CATEGORY_COLORS[template.category] || 'text-cyan-400';

  return (
    <button
      onClick={() => onClick(template)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left w-full group"
      style={{
        backgroundColor: '#2a2a2a',
        border: '1px solid #333333',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#333333';
        e.currentTarget.style.borderColor = '#444444';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#2a2a2a';
        e.currentTarget.style.borderColor = '#333333';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div
        className={`${template.icon} ${iconColor} text-xl flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{template.name}</p>
        <p className="text-xs text-[#9ca3af] truncate">{template.description}</p>
      </div>
      <div className="i-ph:arrow-right text-sm text-[#9ca3af] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </button>
  );
};
