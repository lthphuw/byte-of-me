import { Card , Skeleton } from '@/shared/ui';

export function AboutTechStackLoading() {
  // Define a set of different "pill" width variations to create a natural look
  const pillWidths = [
    'w-24', // Short (Go, Redis)
    'w-32', // Medium (FastAPI, Docker)
    'w-40', // Long (TypeScript, Tailwind CSS)
    'w-28', // Med-Short
  ];

  return (
    <section className="space-y-8">
      {/* "Skills / Tech Stack" Title */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-56 md:h-10 md:w-80" />
      </div>

      <div className="pl-0">
        {/*
          Responsive Grid: 1 column on mobile (like image_3),
          2 columns on md/desktop (like image_2).
          Matched padding/gap structure of your cards.
        */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/*
            Generating 8 skeleton cards to represent the common categories
            shown (Language, Database, Frontend, Backend, etc.).
          */}
          {[...Array(8)].map((_, cardIndex) => (
            <Card
              key={cardIndex}
              className="border border-border/50 bg-background/50 p-6"
            >
              <div className="space-y-5">
                {/* Category Title Skeleton (e.g., "Language") */}
                <Skeleton className="h-4 w-28" />

                {/* Container for the specific tech pills */}
                <div className="flex flex-wrap gap-3">
                  {/*
                    Generate 2 to 4 random-looking pills per category
                    using the pre-defined width variations.
                  */}
                  {[...Array(Math.floor(Math.random() * 3) + 2)].map(
                    (_, pillIndex) => {
                      const widthClass =
                        pillWidths[(cardIndex + pillIndex) % pillWidths.length];
                      return (
                        <Skeleton
                          key={pillIndex}
                          className={`h-10 ${widthClass} rounded-md border border-border`}
                        />
                      );
                    }
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
