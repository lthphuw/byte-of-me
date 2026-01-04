import { Trash } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button, ButtonProps } from '@/components/ui/button';

export type TrashButtonProps = BaseComponentProps & {
  onClick?: ButtonProps['onClick'];
  disabled?: boolean;
};

export function TrashButton({
                              onClick,
                              className,
                              style,
                              disabled,
                            }: TrashButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={cn(
        `
        h-8 w-8
        rounded-md
        text-muted-foreground
        transition-colors
        hover:bg-destructive/10
        hover:text-destructive
        focus-visible:ring-1
        focus-visible:ring-destructive
        `,
        className
      )}
    >
      <Trash className="h-4 w-4" />
    </Button>
  );
}
