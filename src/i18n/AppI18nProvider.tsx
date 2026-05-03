import React, { useEffect, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ensureNamespacesLoaded, i18n, setAppLanguage } from './config';

interface AppI18nProviderProps {
  children: ReactNode;
}

export function AppI18nProvider({ children }: AppI18nProviderProps): React.ReactElement {
  const { language } = useAuth();

  useEffect(() => {
    void ensureNamespacesLoaded(['common', 'auth']);
  }, []);

  useEffect(() => {
    void setAppLanguage(language);
  }, [language]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
