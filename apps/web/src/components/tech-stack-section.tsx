'use client';

import Image from 'next/image';
import { TechStack } from '@/models/tech-stack';

export function TechStackSection({ techStacks }: { techStacks: TechStack[] }) {
  const grouped = techStacks.reduce<Record<string, TechStack[]>>(
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
              <div
                key={tech.id}
                className="flex items-center gap-2 border rounded-lg px-3 py-2"
              >
                {tech.logo && (
                  <Image
                    src={tech.logo.url}
                    alt={tech.name}
                    width={18}
                    height={18}
                  />
                )}
                <span className="text-sm">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
