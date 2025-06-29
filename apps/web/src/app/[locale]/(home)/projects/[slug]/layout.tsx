import { Project } from '@db/index';
import type { Metadata } from 'next';

import { fetchData } from '@/lib/fetch';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;

  const project = await fetchData<Project>(`me/projects/${slug}`);
  if (!project) {
    return {
      title: 'Not found project...',
    };
  }

  return {
    title: `${project.title} | Phú`,
    description: project.description,
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
