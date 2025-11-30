import Image from 'next/image';
import { Prisma } from '@repo/db/generated/prisma/client';
import DOMPurify from 'isomorphic-dompurify';
import { getTranslations } from 'next-intl/server';


import { supportedLanguages } from '@/config/language';
import { fetchData } from '@/lib/core/fetch';
import AboutContent from '@/components/about-content';
import { AboutShell } from '@/components/shell';
import { TechGroup } from '@/components/tech-stack';
import { TimelineItemProps } from '@/components/timeline';


export function generateStaticParams() {
  return supportedLanguages.map((lang) => ({ locale: lang }));
}

export default async function AboutPage() {
  const t = await getTranslations('about');

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
      techstacks: 'true,'
    }
  });

  if (!user) {
    return null;
  }

  // Techstacks
  const techGroups: TechGroup[] = (user.techstacks || []).reduce((groups, tech) => {
    let group = groups.find((g) => g.title === tech.group);
    if (!group) {
      group = { title: tech.group, items: [] };
      groups.push(group);
    }
    group.items.push({
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
    timeline: edu.timeline,
    title: edu.title,
    message: DOMPurify.sanitize(edu.message || ''),
    icon: edu.icon ? (
      <Image src={edu.icon} alt="" width={32} height={32} />
    ) : undefined,
    username: '',
    subItems:
      Array.isArray(edu.subItems) ?
      edu.subItems?.map((sub: any) => ({
        title: sub.title,
        message: DOMPurify.sanitize(sub.message),
      })) : [],
  }));

  const tocItems = [
    { href: '#aboutme', label: t('section.About me') },
    { href: '#education', label: t('section.Education') },
    { href: '#skills', label: t('section.Skills / Tech Stack') },
  ];

  return (
    <AboutShell>
      <AboutContent
        user={user}
        techGroups={techGroups}
        educationItems={educationItems}
        tocItems={tocItems}
        sectionTitles={{
          aboutMe: t('section.About me'),
          education: t('section.Education'),
          skills: t('section.Skills / Tech Stack'),
        }}
      />
    </AboutShell>
  );
}
