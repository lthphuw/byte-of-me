import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { host } from '@/config/host';
import { siteConfig } from '@/config/site';
import { fetchData } from '@/lib/core/fetch';
import { Project } from '@/components/project-list';





type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const url = `${host}/${locale}/projects/${slug}`;
  const t = await getTranslations('metadata.projects');

  const project = await fetchData<Project>(`me/projects/${slug}`);
  if (!project) {
    return {
      title: 'Project not found | Byte of me',
      description:
        'The project you’re looking for does not exist or has been removed.',
    };
  }

  const tags = Array.isArray((project as any)?.tags)
    ? (project as any).tags.map((t: any) => t.name)
    : [];

  const techstacks = Array.isArray((project as any)?.techstacks)
    ? (project as any).techstacks.map((t: any) => t.name)
    : [];

  // De-duplicate keywords
  const keywordSet = new Set([
    project.title,
    ...tags,
    ...techstacks,
    'Projects',
    ...siteConfig.keywords,
  ]);

  const keywords = Array.from(keywordSet).map((key) => key.toLowerCase());

  const fallbackDescription = 'A project built with modern technologies.';

  return {
    title: `${project.title} | ${t('title')} | Byte of me`,
    description: project.description || fallbackDescription,
    keywords,
    alternates: {
      canonical: url,
      languages: {
        vi: `${siteConfig.url}/vi/projects/${slug}`,
        en: `${siteConfig.url}/en/projects/${slug}`,
        fr: `${siteConfig.url}/fr/projects/${slug}`,
      },
    },

    openGraph: {
      title: `${project.title} | ${t('title')} | Byte of me`,
      description: project.description || fallbackDescription,
      url,
      type: 'website',
      locale: locale === 'vi' ? 'vi_VN' : locale === 'fr' ? 'fr_FR' : 'en_US',
      siteName: 'Byte of me',
      images: [`${siteConfig.url}/images/avatars/HaNoi2024.jpeg`],
    },

    twitter: {
      card: 'summary_large_image',
      title: `${project.title} | ${t('title')} | Byte of me`,
      description: project.description || fallbackDescription,
      images: [`${siteConfig.url}/images/avatars/HaNoi2024.jpeg`],
      creator: '@lthphuw',
    },
  };
}

interface ProjectDetailsLayoutProps {
  children?: React.ReactNode;
}

export default async function ProjectDetailsLayout({
  children,
}: ProjectDetailsLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
