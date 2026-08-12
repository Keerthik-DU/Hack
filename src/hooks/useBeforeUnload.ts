import { useEffect } from 'react';

/**
 * Registers a beforeunload handler while `when` is true (WO-045).
 * Shows the browser native unsaved-changes dialog on navigation/close.
 */
export function useBeforeUnload(when: boolean): void {
  useEffect(() => {
    if (!when) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [when]);
}
