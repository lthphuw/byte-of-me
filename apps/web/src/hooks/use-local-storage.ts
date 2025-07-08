import { UseStorageOptions, createStorage, readValue } from './utils';

export function useLocalStorage<T = string>(props: UseStorageOptions<T>) {
  return createStorage<T>('localStorage', 'use-local-storage')(props);
}

export const readLocalStorageValue = readValue('localStorage');
