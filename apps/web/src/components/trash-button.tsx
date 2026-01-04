import { Trash } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type TrashButtonProps = BaseComponentProps & {
  removeFunc?: () => void;
  disabled?: boolean;
};

export function TrashButton({
                              removeFunc,
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
      onClick={removeFunc}
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
