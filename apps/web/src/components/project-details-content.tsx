'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Prisma } from '@repo/db/generated/prisma/client';
import { SlashIcon } from 'lucide-react';

import { Routes } from '@/config/global';
import { extractToc } from '@/lib/core/markdown';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BlogContent } from '@/components/blog-content';
import { FloatingToc } from '@/components/floating-toc';

export type Project = Prisma.ProjectGetPayload<{
  include: {
    blogs: true;
    techstacks: {
      include: { techstack: true };
    };
    tags: {
      include: { tag: true };
    };
  };
}>;

export type ProjectDetailsContentProps = BaseComponentProps & {
  project: Project;
};

export function ProjectDetailsContent({
  project,
  className,
}: ProjectDetailsContentProps) {
  const [activeBlogId, setActiveBlogId] = useState(project.blogs?.[0]?.id);

  return (
    <div
      className={cn(
        'space-y-6 container mx-auto px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList className="flex flex-wrap">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={Routes.Homepage}>Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <SlashIcon className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={Routes.Projects}>Projects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <SlashIcon className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>{project.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {project.title}
        </h1>

        {/* Tech stacks */}
        <div className="flex flex-wrap gap-2">
          {project.techstacks.map((t) => (
            <Badge key={t.techstack.id} variant="secondary">
              {t.techstack.name}
            </Badge>
          ))}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {project.tags.map((t) => (
            <Badge key={t.tag.id} variant="outline">
              #{t.tag.name}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Blogs */}
      <Tabs
        value={activeBlogId}
        onValueChange={setActiveBlogId}
        className="space-y-4"
      >
        <TabsList className="flex flex-wrap justify-start overflow-x-auto pb-2">
          {project.blogs.map((blog) => (
            <TabsTrigger
              key={blog.id}
              value={blog.id}
              className="flex-shrink-0"
            >
              {blog.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {project.blogs?.map((blog) => {
          const toc = extractToc(blog.content ?? '')
            .filter((item) => item.depth === 2)
            .map((item) => ({
              href: `#${item.id}`,
              label: item.text,
            }));

          return (
            <TabsContent key={blog.id} value={blog.id} className="relative">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 lg:gap-8">
                {/* Content */}
                <Card className="p-4 sm:p-6">
                  <BlogContent content={blog.content ?? ''} tocItems={toc} />
                </Card>

                {/* TOC */}
                {toc.length > 0 && (
                  <div className="hidden lg:block sticky top-20 self-start">
                    <FloatingToc items={toc} />
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
