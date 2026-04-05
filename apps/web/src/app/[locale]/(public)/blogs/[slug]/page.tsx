import Link from 'next/link';
import {
  Calendar,
  Clock,
  ExternalLink,
  FolderCode,
  Tag as TagIcon,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getBlogBySlug } from '@/lib/actions/public/get-blog-by-slug';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RichText } from '@/components/rich-text';
import { BlogDetailsShell } from '@/components/shell';

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations('blogDetails');
  const { data: blog, success } = await getBlogBySlug(slug);

  if (!success) {
    return (
      <div className="p-4">
        <p className="text-red-500">{t('failedToLoadBlog')}</p>
      </div>
    );
  }

  return (
    <BlogDetailsShell>
      <div className="container px-4 py-10">
        <div className="flex justify-center">
          <div className="w-full max-w-3xl">
            {/* TITLE */}
            <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight">
              {blog.title}
            </h1>

            {/* DESCRIPTION */}
            {blog.description && (
              <p className="mt-3 text-muted-foreground text-lg">
                {blog.description}
              </p>
            )}

            {/* META */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              {blog.publishedDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(blog.publishedDate).toLocaleDateString()}
                </div>
              )}

              {blog.readingTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {t('readingTime', { time: blog.readingTime?.toString() })}
                </div>
              )}
            </div>

            {/* TAGS */}
            <div className="flex flex-wrap gap-2 mt-4">
              {blog.tags.map((tag) => (
                <Link key={tag.id} href={`/blogs?tag=${tag.slug}`}>
                  <Badge
                    variant="secondary"
                    className="hover:bg-primary/10 hover:text-primary transition"
                  >
                    <TagIcon className="h-3 w-3 mr-1" />
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>

            {/* COVER */}
            {blog.coverImage && (
              <img
                src={blog.coverImage.url}
                alt={blog.title}
                className="w-full rounded-xl mt-8 mb-10 border object-cover"
              />
            )}

            {/* CONTENT */}
            <article className="prose prose-neutral dark:prose-invert max-w-none">
              <RichText content={blog.content} />
            </article>

            {/* PROJECT */}
            {blog.project && (
              <>
                <Separator className="my-10" />

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-3">
                    {t('relatedProject')}
                  </p>

                  <Card className="p-4 hover:border-primary/50 transition group">
                    <Link href={blog.project.githubLink!} target="_blank">
                      <div className="flex items-center gap-2 text-primary">
                        <FolderCode className="h-4 w-4" />
                        <span className="font-semibold text-sm">
                          {blog.project.title}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">
                        {blog.project.description}
                      </p>

                      <div className="flex items-center gap-1 text-xs text-primary mt-3">
                        {t('viewProject')}
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    </Link>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </BlogDetailsShell>
  );
}
