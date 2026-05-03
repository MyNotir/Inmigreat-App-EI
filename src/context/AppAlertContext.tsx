import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { AppAlertModal } from '../components/common/AppAlertModal';
import type { AppAlertAction, AppAlertConfig, ErrorAlertOptions } from '../types/alerts';
import { buildAlertFromError } from '../utils/errorAlerts';

export interface AppAlertContextValue {
  showAlert: (config: AppAlertConfig) => void;
  showError: (error: unknown, options?: ErrorAlertOptions) => boolean;
  dismissAlert: () => void;
}

const AppAlertContext = createContext<AppAlertContextValue | undefined>(undefined);

interface AppAlertProviderProps {
  children: ReactNode;
}

export function AppAlertProvider({ children }: AppAlertProviderProps): React.ReactElement {
  const [currentAlert, setCurrentAlert] = useState<AppAlertConfig | null>(null);

  const dismissAlert = useCallback(() => {
    setCurrentAlert(null);
  }, []);

  const showAlert = useCallback((config: AppAlertConfig) => {
    setCurrentAlert(config);
  }, []);

  const showError = useCallback((error: unknown, options?: ErrorAlertOptions) => {
    const nextAlert = buildAlertFromError(error, options);
    if (!nextAlert) {
      return false;
    }

    setCurrentAlert(nextAlert);
    return true;
  }, []);

  const handleActionPress = useCallback((action?: AppAlertAction) => {
    setCurrentAlert(null);

    if (action?.onPress) {
      requestAnimationFrame(() => {
        action.onPress?.();
      });
    }
  }, []);

  const contextValue = useMemo<AppAlertContextValue>(() => ({
    showAlert,
    showError,
    dismissAlert,
  }), [dismissAlert, showAlert, showError]);

  return (
    <AppAlertContext.Provider value={contextValue}>
      {children}
      <AppAlertModal
        visible={Boolean(currentAlert)}
        alert={currentAlert}
        onDismiss={dismissAlert}
        onActionPress={handleActionPress}
      />
    </AppAlertContext.Provider>
  );
}

export function useAppAlert(): AppAlertContextValue {
  const context = useContext(AppAlertContext);

  if (!context) {
    throw new Error('useAppAlert must be used within an AppAlertProvider');
  }

  return context;
}