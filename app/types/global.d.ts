interface Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  webkitSpeechRecognition: typeof SpeechRecognition;
  SpeechRecognition: typeof SpeechRecognition;
}

interface Performance {
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
}

/*
 * No React type augmentation here — augmenting React types
 * via `declare module 'react'` or `declare namespace React`
 * breaks Vite SSR module resolution (causes __vite_ssr_import errors).
 * Non-standard HTML attributes like webkitdirectory are handled
 * inline with type assertions in the components that need them.
 */
