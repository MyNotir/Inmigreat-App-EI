import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ensureNamespacesLoaded } from './config';
import type { TranslationNamespace } from './types';

export function useViewTranslation(namespace: TranslationNamespace) {
  const namespaces = useMemo(() => {
    if (namespace === 'common') {
      return ['common'] as const;
    }

    return [namespace, 'common'] as const;
  }, [namespace]);
  const [isReady, setIsReady] = useState(namespace === 'common');
  const translation = useTranslation(namespaces, { useSuspense: false });

  useEffect(() => {
    let cancelled = false;

    setIsReady(namespace === 'common');

    void ensureNamespacesLoaded(namespaces).then(() => {
      if (!cancelled) {
        setIsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [namespace, namespaces]);

  return {
    ...translation,
    isReady,
  };
}
