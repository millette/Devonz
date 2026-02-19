// Core exports
export { ControlPanel } from './core/ControlPanel';
export type { TabType, TabVisibilityConfig, SidebarCategory } from './core/types';

// Constants
export { TAB_LABELS, TAB_DESCRIPTIONS, DEFAULT_TAB_CONFIG, SIDEBAR_CATEGORIES } from './core/constants';

// Shared components
export { TabTile } from './shared/components/TabTile';

// Utils
export { getVisibleTabs, reorderTabs, resetToDefaultConfig } from './utils/tab-helpers';
