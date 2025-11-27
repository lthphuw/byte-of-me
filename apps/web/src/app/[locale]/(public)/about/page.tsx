import Image from 'next/image';
import { Education, TechStack, User } from '@db/index';
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

  const [user, educations, techstacks] = await Promise.all([
    fetchData<User>('me'),
    fetchData<Education[]>('me/educations'),
    fetchData<TechStack[]>('me/techstacks'),
  ]);

  // Process tech stacks into groups
  const techGroups: TechGroup[] = techstacks.reduce((groups, tech) => {
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

  // Transform educations into timeline items
  const educationItems: TimelineItemProps[] = educations.map((edu: any) => ({
    timeline: edu.timeline,
    title: edu.title,
    message: DOMPurify.sanitize(edu.message || ''),
    icon: edu.icon ? (
      <Image src={edu.icon} alt="" width={32} height={32} />
    ) : undefined,
    username: '',
    subItems:
      Array.isArray(edu.subItems) &&
      edu.subItems?.map((sub: any) => ({
        title: sub.title,
        message: DOMPurify.sanitize(sub.message),
      })),
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
