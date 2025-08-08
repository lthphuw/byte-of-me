// @see https://github.com/mantinedev/mantine
import { nanoid } from 'nanoid';





// packages/@mantine/hooks/src/utils/random-id/random-id.ts
export function randomId(prefix = 'byte-of-me-'): string {
  return `${prefix}${Math.random().toString(36).slice(2, 11)}`;
}

// With stronger entropy
export function generateId(prefix = 'byte-of-me-') {
  return prefix + nanoid(16);
}
