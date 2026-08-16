import { Skeleton } from '@byte-of-me/ui';

import { ExperienceShell } from '@/widgets/public/experience-content/ui/experience-shell';

export default function ExperienceLoading() {
  return (
    <ExperienceShell>
      <div className="flex justify-center px-0 py-8 md:px-8 md:py-12">
        <div className="w-full max-w-3xl">
          <div className="border-b pb-6">
            <Skeleton className="h-9 w-56 md:h-11" />
          </div>

          <div className="mt-10 space-y-8 md:space-y-12">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[3rem_1fr] gap-x-4 md:grid-cols-[3.5rem_1fr] md:gap-x-6"
              >
                <Skeleton className="h-12 w-12 rounded-full md:h-14 md:w-14" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <div className="space-y-2 pt-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ExperienceShell>
  );
}
