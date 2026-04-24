import { Pencil } from 'lucide-react';

import { Button } from '@/shared/ui';

export interface EditButtonProps {
  isSubmitting?: boolean;
  onClick?: () => void;
}

export function EditButton({ onClick, isSubmitting }: EditButtonProps) {
  return (
    <Button
      size="icon"
      type={'button'}
      variant="ghost"
      className="h-8 w-8"
      disabled={isSubmitting}
      onClick={onClick}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}
