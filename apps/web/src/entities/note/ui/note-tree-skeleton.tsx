import { Skeleton } from '@byte-of-me/ui';

export function NoteTreeSkeleton() {
  return (
    <div className="space-y-2 p-2" aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-7 w-full" />
      ))}
    </div>
  );
}
