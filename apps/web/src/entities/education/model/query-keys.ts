export const educationKeys = {
  all: ['education'] as const,
  list: () => [...educationKeys.all, 'list'] as const,
};
