'use client';

import type { ReactNode } from 'react';
import { Button, Skeleton } from '@byte-of-me/ui';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';

/** One row or card. The skeleton reuses it, so a loaded row keeps its height. */
const ITEM_CLASS =
  'flex items-center gap-3 rounded-xl border bg-card p-3 md:p-4';

interface RecordListItemProps {
  leading?: ReactNode;
  /** The main slot: the title and its meta, truncated by the caller. */
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function RecordListItem({
  leading,
  children,
  actions,
  className,
}: RecordListItemProps) {
  return (
    <div className={cn(ITEM_CLASS, className)}>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">{children}</div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

interface RecordRowActionsProps {
  /** The item's visible name, used in both accessible names. */
  name: string;
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}

export function RecordRowActions({
  name,
  onEdit,
  onDelete,
  disabled = false,
}: RecordRowActionsProps) {
  const t = useTranslations('dashboard.shared.crud');

  return (
    <>
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onEdit}
          aria-label={t('editItem', { name })}
        >
          <Pencil />
        </Button>
      )}
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hover:text-destructive-text"
          disabled={disabled}
          onClick={onDelete}
          aria-label={t('deleteItem', { name })}
        >
          <Trash2 />
        </Button>
      )}
    </>
  );
}

interface RecordListSkeletonProps {
  /** Rows, or cards in the grid, to show while the list loads. */
  rows?: number;
  variant?: 'list' | 'grid';
}

/** The loading state of a record list: one row per record, at the row's size. */
export function RecordListSkeleton({
  rows = 6,
  variant = 'list',
}: RecordListSkeletonProps) {
  return (
    <div
      aria-busy="true"
      className={
        variant === 'grid'
          ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'
          : 'space-y-2'
      }
    >
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={ITEM_CLASS}>
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </div>
        </div>
      ))}
    </div>
  );
}
