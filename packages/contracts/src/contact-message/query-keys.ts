export const contactMessageKeys = {
  all: ['contact-message'] as const,
  list: (page: number, search: string) =>
    [...contactMessageKeys.all, 'list', page, search] as const,
};
