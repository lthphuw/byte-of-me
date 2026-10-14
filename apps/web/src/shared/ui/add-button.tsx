import type { ComponentProps } from 'react';
import { Button } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

type AddButtonProps = Pick<
  ComponentProps<typeof Button>,
  'variant' | 'size' | 'disabled' | 'className'
> & {
  label: string;
  onClick: () => void;
};

/**
 * A "+ label" button: a manager's New, a form's Add row. 36px with a pointer,
 * the dashboard's control height; the Button already gives 44px on touch.
 */
export function AddButton({
  label,
  size = 'sm',
  className,
  ...props
}: AddButtonProps) {
  return (
    <Button
      size={size}
      className={cn('can-hover:min-h-9', className)}
      {...props}
    >
      <Plus />
      {label}
    </Button>
  );
}
