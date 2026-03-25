import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';

export function usePageLeaveWarning() {
  const sessionFiles = useAppStore((s) => s.sessionFiles);
  const clearSessionFiles = useAppStore((s) => s.clearSessionFiles);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (sessionFiles.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved files. They will be deleted if you leave. Are you sure?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionFiles]);

  // Optional: Handle page reload specifically
  useEffect(() => {
    const handleUnload = () => {
      // Files will be cleared on next page load
      if (sessionFiles.length > 0) {
        clearSessionFiles();
      }
    };

    window.addEventListener('unload', handleUnload);
    return () => window.removeEventListener('unload', handleUnload);
  }, [sessionFiles, clearSessionFiles]);
}
