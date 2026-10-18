import type { ComponentProps } from 'react';
import { Button } from '@byte-of-me/ui';
import { Plus } from 'lucide-react';

type AddButtonProps = Pick<
  ComponentProps<typeof Button>,
  'variant' | 'size' | 'disabled' | 'className'
> & {
  label: string;
  onClick: () => void;
};

/**
 * A "+ label" button: a manager's New, a form's Add row. The Button's default
 * 32px, the dashboard's control height; its `touch-target` strip gives 44px on touch.
 */
export function AddButton({
  label,
  size = 'default',
  className,
  ...props
}: AddButtonProps) {
  return (
    <Button size={size} className={className} {...props}>
      <Plus />
      {label}
    </Button>
  );
}
