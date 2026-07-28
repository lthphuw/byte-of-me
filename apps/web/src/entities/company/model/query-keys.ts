export const companyKeys = {
  all: ['company'] as const,
  list: () => [...companyKeys.all, 'list'] as const,
};
