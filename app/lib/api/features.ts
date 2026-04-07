import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('Features');

export interface Feature {
  id: string;
  name: string;
  description: string;
  viewed: boolean;
  releaseDate: string;
}

const FEATURES: Omit<Feature, 'viewed'>[] = [
  {
    id: 'feature-1',
    name: 'Dark Mode',
    description: 'Enable dark mode for better night viewing',
    releaseDate: '2024-03-15',
  },
  {
    id: 'feature-2',
    name: 'Tab Management',
    description: 'Customize your tab layout',
    releaseDate: '2024-03-20',
  },
];

function getViewedFeatureIds(): Set<string> {
  if (typeof globalThis.localStorage === 'undefined') {
    return new Set();
  }

  try {
    const stored = localStorage.getItem('viewed_features');
    return new Set<string>(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

export const getFeatureFlags = async (): Promise<Feature[]> => {
  const viewedIds = getViewedFeatureIds();

  return FEATURES.map((feature) => ({
    ...feature,
    viewed: viewedIds.has(feature.id),
  }));
};

export const markFeatureViewed = async (featureId: string): Promise<void> => {
  logger.debug(`Marking feature ${featureId} as viewed`);

  const viewedIds = getViewedFeatureIds();
  viewedIds.add(featureId);

  if (typeof globalThis.localStorage !== 'undefined') {
    try {
      localStorage.setItem('viewed_features', JSON.stringify([...viewedIds]));
    } catch {
      logger.debug('Failed to persist viewed features to localStorage');
    }
  }
};
