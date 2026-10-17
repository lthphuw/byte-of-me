export const educationKeys = {
  all: ['education'] as const,
  adminList: () => [...educationKeys.all, 'admin-list'] as const,
  /** One page of the admin list: the key the server prefetch and the manager share. */
  adminPage: (page: number) => [...educationKeys.adminList(), page] as const,
  /** Full entry (achievement bodies included) fetched on demand when the editor opens. */
  detail: (educationId: string) =>
    [...educationKeys.all, 'detail', educationId] as const,
};
