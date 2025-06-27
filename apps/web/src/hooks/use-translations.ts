import { useTranslations as staticTranslator } from 'next-intl';

export function useTranslations(namespace: string) {
  const t = staticTranslator(namespace as any);

  return (key: string, fallback?: string): string => {
    try {
      return t(key as never);
    } catch (error) {
      return fallback ?? key;
    }
  };
}
