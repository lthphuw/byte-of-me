import { nanoid } from 'nanoid';

export function generateId(prefix = 'byte-of-me-') {
  return prefix + nanoid(16);
}
