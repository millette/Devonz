import { useCallback } from 'react';
import { toast as toastify } from 'sonner';

// Export the original toast for cases where specific configuration is needed
export { toastify as toast };

interface ToastOptions {
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export function useToast() {
  const toast = useCallback((message: string, options: ToastOptions = {}) => {
    const { type = 'info', duration = 3000 } = options;

    toastify[type](message, {
      duration,
    });
  }, []);

  const success = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
      toast(message, { ...options, type: 'success' });
    },
    [toast],
  );

  const error = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
      toast(message, { ...options, type: 'error' });
    },
    [toast],
  );

  const info = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
      toast(message, { ...options, type: 'info' });
    },
    [toast],
  );

  const warning = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
      toast(message, { ...options, type: 'warning' });
    },
    [toast],
  );

  return { toast, success, error, info, warning };
}
