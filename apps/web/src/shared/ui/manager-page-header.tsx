import type { ReactNode } from 'react';

interface ManagerPageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function ManagerPageHeader({
  title,
  description,
  action,
}: ManagerPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
