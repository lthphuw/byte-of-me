export const workspaceSettingsKeys = {
  all: ['workspace-settings'] as const,
  current: () => [...workspaceSettingsKeys.all, 'current'] as const,
};
