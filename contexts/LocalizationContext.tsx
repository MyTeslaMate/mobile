import { saveLanguage } from '@/i18n';
import * as Localization from 'expo-localization';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type SupportedLanguage =
  | 'de'
  | 'en'
  | 'es'
  | 'fr'
  | 'it'
  | 'nl'
  | 'ru'
  | 'zh';

interface LocalizationContextType {
  currentLanguage: SupportedLanguage;
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  deviceLanguage: string;
  availableLanguages: { code: SupportedLanguage; name: string; flag: string }[];
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(
  undefined
);

const AVAILABLE_LANGUAGES = [
  { code: 'en' as SupportedLanguage, name: 'English', flag: '🇺🇸' },
  { code: 'fr' as SupportedLanguage, name: 'Français', flag: '🇫🇷' },
  { code: 'es' as SupportedLanguage, name: 'Español', flag: '🇪🇸' },
  { code: 'de' as SupportedLanguage, name: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh' as SupportedLanguage, name: '中文（简体）', flag: '🇨🇳' },
  { code: 'nl' as SupportedLanguage, name: 'Nederlands', flag: '🇳🇱' },
  { code: 'it' as SupportedLanguage, name: 'Italiano', flag: '🇮🇹' },
  { code: 'ru' as SupportedLanguage, name: 'Русский', flag: '🇷🇺' },
];

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) || 'en'
  );

  const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng as SupportedLanguage);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const changeLanguage = async (language: SupportedLanguage) => {
    try {
      await i18n.changeLanguage(language);
      await saveLanguage(language);
      setCurrentLanguage(language);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const value: LocalizationContextType = {
    currentLanguage,
    changeLanguage,
    t,
    deviceLanguage,
    availableLanguages: AVAILABLE_LANGUAGES,
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error(
      'useLocalization must be used within a LocalizationProvider'
    );
  }
  return context;
};
