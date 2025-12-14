import { Prisma } from '@repo/db/generated/prisma/client';
import DOMPurify from 'isomorphic-dompurify';

import { fetchData } from '@/lib/core/fetch';
import { getTranslations } from '@/lib/i18n';
import AboutContent from '@/components/about-content';
import { AboutShell } from '@/components/shell';
import { TechGroup } from '@/components/tech-stack-experience';
import { TimelineItemProps } from '@/components/timeline';





export default async function AboutPage() {
  const t = await getTranslations();

  const user = await fetchData<Prisma.UserGetPayload<{
    include: {
      educations: {
        include: {
          subItems: true,
        }
      },
      techstacks: true,
    }
  }>>('me', {
    params: {
      educations: 'true',
      techstacks: 'true',
    }
  });

  if (!user) {
    return null;
  }

  console.log(`Techstack: ${JSON.stringify(user, null, 2)}`);

  // Techstacks
  const techGroups: TechGroup[] = (user.techstacks || []).reduce((groups, tech) => {
    let group = groups.find((g) => g.title === tech.group);
    if (!group) {
      group = { title: tech.group, items: [] };
      groups.push(group);
    }
    group.items.push({
      id: tech.id,
      name: tech.name,
      logo: tech.logo || '',
    });
    return groups;
  }, [] as TechGroup[]);

  // Educations
  const educationItems: TimelineItemProps[] = (user.educations || []).map((edu: Prisma.EducationGetPayload<{
    include: {
      subItems: true
    }
  }>) => ({
    timeline: t(edu.timeline),
    title: t(edu.title),
    message: t(DOMPurify.sanitize(edu.message || '')),
    icon: edu.icon || '',
    username: '',
    subItems:
      Array.isArray(edu.subItems) ?
      edu.subItems?.map((sub: any) => ({
        title: sub.title,
        message: t(DOMPurify.sanitize(sub.message)),
      })) : [],
  }));

  const tocItems = [
    { href: '#aboutme', label: t('about.section.About me') },
    { href: '#education', label: t('about.section.Education') },
    { href: '#skills', label: t('about.section.Skills / Tech Stack') },
  ];

  return (
    <AboutShell>
      <AboutContent
        user={user}
        techGroups={techGroups}
        educationItems={educationItems}
        tocItems={tocItems}
        sectionTitles={{
          aboutMe: t('about.section.About me'),
          education: t('about.section.Education'),
          skills: t('about.section.Skills / Tech Stack'),
        }}
      />
    </AboutShell>
  );
}
