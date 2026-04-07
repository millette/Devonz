/**
 * Error Toast
 *
 * Thin wrapper around Sonner toast for displaying classified errors.
 * Non-fatal errors (warning / info) are shown as toasts instead of the
 * full ChatAlert dialog, keeping the UI unobtrusive for minor issues.
 */

import { toast } from 'sonner';
import type { ClassifiedError } from './error-classifier';

/** Duration in milliseconds by severity */
const DURATION_BY_SEVERITY: Record<ClassifiedError['severity'], number> = {
  fatal: 8000,
  error: 6000,
  warning: 4000,
  info: 3000,
};

/**
 * Show a toast notification for a classified error.
 *
 * - `fatal` / `error` → `toast.error` (red, longer duration)
 * - `warning` → `toast.warning` (yellow)
 * - `info` → `toast.info` (blue)
 *
 * If the error has a suggestion, it is appended on a second line.
 */
export function showErrorToast(classified: ClassifiedError): void {
  const duration = DURATION_BY_SEVERITY[classified.severity];
  const description = classified.suggestion;

  switch (classified.severity) {
    case 'fatal':
    case 'error': {
      toast.error(classified.message, { duration, description });
      break;
    }
    case 'warning': {
      toast.warning(classified.message, { duration, description });
      break;
    }
    case 'info': {
      toast.info(classified.message, { duration, description });
      break;
    }
  }
}
