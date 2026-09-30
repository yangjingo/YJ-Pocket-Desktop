import i18next from 'i18next';
import zh from './locales/zh.json';
import en from './locales/en.json';

export type Locale = 'zh' | 'en';

const i18n = i18next.createInstance();
void i18n.init({ lng: 'zh', fallbackLng: 'zh', initAsync: false,
  resources: { zh: { translation: zh }, en: { translation: en } } });

export const t = (key: string): string => String(i18n.t(key));
export const setLanguage = (language: Locale): Promise<unknown> => i18n.changeLanguage(language);
