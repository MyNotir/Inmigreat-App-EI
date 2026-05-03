import React, { useCallback, useMemo, useState } from 'react';

import {
  PremiumPaywallModal,
  type PremiumPaywallConfig,
} from '../components/premium/PremiumPaywallModal';
import { useAppAlert } from '../context/AppAlertContext';
import { useViewTranslation } from '../i18n';

export function usePremiumPaywall(defaultConfig?: PremiumPaywallConfig) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<PremiumPaywallConfig>(defaultConfig ?? {});
  const { showAlert } = useAppAlert();
  const { t } = useViewTranslation('premium');
  const tx = useCallback(
    (key: string, fallback: string) => t(key, { defaultValue: fallback }),
    [t],
  );

  const closePaywall = useCallback(() => {
    setVisible(false);
  }, []);

  const openPaywall = useCallback(
    (nextConfig?: PremiumPaywallConfig) => {
      setConfig({
        ...(defaultConfig ?? {}),
        ...(nextConfig ?? {}),
      });
      setVisible(true);
    },
    [defaultConfig],
  );

  const handleSubscribe = useCallback(() => {
    showAlert({
      title: tx('alert.title', 'Suscripcion Pro'),
      message: tx(
        'alert.message',
        'La activacion y administracion de planes estara disponible proximamente.',
      ),
      tone: 'info',
      actions: [{ label: tx('alert.acknowledge', 'Entendido'), onPress: closePaywall }],
    });
  }, [closePaywall, showAlert, tx]);

  const paywallElement = useMemo(
    () => (
      <PremiumPaywallModal
        visible={visible}
        onClose={closePaywall}
        onSubscribe={handleSubscribe}
        {...config}
      />
    ),
    [closePaywall, config, handleSubscribe, visible],
  );

  return {
    openPaywall,
    closePaywall,
    paywallElement,
  };
}

export default usePremiumPaywall;