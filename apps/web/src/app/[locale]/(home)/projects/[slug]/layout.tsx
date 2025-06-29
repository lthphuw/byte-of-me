import type { Metadata, ResolvingMetadata } from 'next';
import { Project } from '@db/index';

import { fetchData } from '@/lib/fetch';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
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
