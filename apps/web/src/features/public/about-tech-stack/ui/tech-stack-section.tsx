'use client';

import { type PublicTechStack,TechStackBadge } from '@/entities/tech-stack';

export function TechStackSection({
  techStacks,
}: {
  techStacks: PublicTechStack[];
}) {
  const grouped = techStacks.reduce<Record<string, PublicTechStack[]>>(
    (acc, item) => {
      acc[item.group] = acc[item.group] || [];
      acc[item.group].push(item);
      return acc;
    },
    {}
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="space-y-4 rounded-xl border p-5">
          <h3 className="text-sm font-medium text-muted-foreground">{group}</h3>

          <div className="flex flex-wrap gap-3">
            {items.map((tech) => (
              <TechStackBadge key={tech.id} tech={tech} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
