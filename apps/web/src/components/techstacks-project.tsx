import { Link } from '@/i18n/navigation';
import { TechStack as TechStackPayload } from '@repo/db/generated/prisma/client';

import { Badge } from '@/components/ui/badge';





export function TechstacksProject({ techs }: { techs: TechStackPayload[]}) {
  if (!techs.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {techs.map((tech, idx) => (
        <Link key={idx} href={`/projects?tech=${tech.id}`}>
          <Badge
            variant="secondary"
            className="
              px-2 py-0.5 text-xs
              bg-muted
              text-muted-foreground
              hover:bg-accent
              hover:text-foreground
            "
          >
            {tech.name}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
