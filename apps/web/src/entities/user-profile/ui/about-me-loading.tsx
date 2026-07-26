import { Skeleton } from '@byte-of-me/ui';

export function AboutMeLoading() {
  return (
    <section>
      {/* Mirrors AboutMe: no visible title — prose starts at the top. */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-[95%]" />
        <Skeleton className="h-5 w-[98%]" />
        <Skeleton className="h-5 w-[40%]" />

        {/* Gap between "paragraphs" */}
        <div className="pt-2" />

        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-[85%]" />
      </div>
    </section>
  );
}
