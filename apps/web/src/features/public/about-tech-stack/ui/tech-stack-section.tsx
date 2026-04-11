'use client';

import { PublicTechStack, TechStackBadge } from '@/entities/tech-stack';

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
    <div className="grid md:grid-cols-2 gap-6">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="rounded-xl border p-5 space-y-4">
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
