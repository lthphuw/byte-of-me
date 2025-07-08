// @see https://github.com/mantinedev/mantine
// packages/@mantine/hooks/src/utils/random-id/random-id.ts

export function randomId(prefix = 'byte-of-me-'): string {
  return `${prefix}${Math.random().toString(36).slice(2, 11)}`;
}
