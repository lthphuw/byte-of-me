import { Button } from '@/shared/ui/button';

import { Loader2, Trash2 } from 'lucide-react';

export interface DeleteButtonProps {
  isSubmitting?: boolean;
  onClick?: () => void;
}

export function DeleteButton({ onClick, isSubmitting }: DeleteButtonProps) {
  return (
    <Button
      type={'button'}
      size="icon"
      variant="ghost"
      className="hover:text-destructive h-8 w-8"
      disabled={isSubmitting}
      onClick={onClick}
    >
      {isSubmitting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
