import { Skeleton } from '@byte-of-me/ui';

/** The loaded picker grid (`media-select.tsx`, `media-multi-select.tsx`), same classes. */
export function MediaPickerSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 12 }, (_, index) => (
        <Skeleton key={index} className="aspect-square rounded-md" />
      ))}
    </div>
  );
}
