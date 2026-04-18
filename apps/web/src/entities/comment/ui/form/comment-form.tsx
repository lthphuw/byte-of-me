import { useTranslations } from 'next-intl';

import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';

export function CommentForm({
  blogId,
  disabled,
}: {
  blogId: string;
  disabled?: boolean;
}) {
  const t = useTranslations('blogDetails');

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border bg-muted/20 p-4">
      <Textarea
        readOnly={disabled}
        disabled={disabled}
        placeholder={t('writingComment')}
        className="min-h-[100px] w-full resize-y bg-background"
      />

      <div className="flex w-full justify-end">
        <Button className="w-full md:w-auto" disabled={disabled}>
          {disabled ? t('signInToComment') : t('postComment')}
        </Button>
      </div>
    </div>
  );
}
