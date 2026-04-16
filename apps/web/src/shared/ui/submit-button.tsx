import * as React from 'react';

import { cn } from '@/shared/lib/utils';
import { Button, type ButtonProps } from '@/shared/ui/button';
import { Icons } from '@/shared/ui/icons';

export type SubmitButtonProps =
  ButtonProps & {
    loading?: boolean;
    className?: string;
    style?: React.CSSProperties;
  };

export function SubmitButton({
  loading,
  className,
  style,
  children,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className={cn('relative flex items-center gap-2', className)}
      style={style}
      {...props}
    >
      <span
        className={cn(
          'h-4 w-4 transition-opacity',
          loading ? 'opacity-100' : 'size-0 hidden opacity-0'
        )}
      >
        <Icons.spinner className="h-4 w-4 animate-spin" />
      </span>

      {children}
    </Button>
  );
}
