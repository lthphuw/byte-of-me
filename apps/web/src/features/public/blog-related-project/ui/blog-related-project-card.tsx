import { Card } from '@byte-of-me/ui';
import { FolderCode } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import { getPublicProjectById } from '@/entities/project';
import { Routes } from '@/shared/config/global';
import { formatDate } from '@/shared/lib/utils';


export async function BlogRelatedProjectCard({
  projectId,
  label,
}: {
  projectId: string;
  label: string;
}) {
  const locale = await getLocale();
  const t = await getTranslations('project');
  const projectResp = await getPublicProjectById(projectId);
  if (!projectResp.success || !projectResp.data) {
    return null;
  }

  const project = projectResp.data;

  const start = formatDate(project.startDate, locale);
  // `locale` on both ends: it was passed to `start` and forgotten here.
  const end = project.endDate
    ? formatDate(project.endDate, locale)
    : t('present');

  return (
    <div className="related-project">
      <p className="mb-2 text-sm font-semibold text-muted-foreground">
        {label}
      </p>
      <Card className="p-4 transition hover:border-primary/50">
        <Link href={project.githubLink ?? Routes.Projects} target="_blank">
          <div className="flex items-center justify-between gap-2 text-primary">
            <div className="flex items-center gap-2 text-primary">
              <FolderCode className="h-4 w-4" />
              <span className="text-sm font-semibold">{project.title}</span>
            </div>

            <time className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {start ? `${start} — ${end}` : 'Ongoing'}
            </time>
          </div>
          <p className="mt-2 line-clamp-2 text-xs italic text-muted-foreground md:line-clamp-3">
            {project.description}
          </p>
        </Link>

        {project.coauthors && project.coauthors.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Co-authors:{' '}
            {project.coauthors.map((coauthor, index) => (
              <span key={coauthor.id}>
                {index > 0 && ', '}
                {coauthor.email ? (
                  <a
                    href={`mailto:${coauthor.email}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {coauthor.fullName}
                  </a>
                ) : (
                  coauthor.fullName
                )}
              </span>
            ))}
          </p>
        )}
      </Card>
    </div>
  );
}
