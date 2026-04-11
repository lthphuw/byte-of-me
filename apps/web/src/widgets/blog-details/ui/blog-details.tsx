import Link from 'next/link';
import { PublicBlog } from '@/entities/blog';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { RichText } from '@/shared/ui/rich-text';
import { Separator } from '@/shared/ui/separator';
import { BlogDetailsShell } from '@/widgets/blog-details/ui/blog-shells';
import { Calendar, Clock, FolderCode, Tag as TagIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function BlogDetails({ blog }: { blog: PublicBlog }) {
  const t = await getTranslations('blogDetails');

  return (
    <BlogDetailsShell>
      <div className="flex flex-col items-center w-full md:px-8 py-8 md:py-12 min-w-0 overflow-hidden">
        <div className="w-full max-w-3xl min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight break-words">
            {blog.title}
          </h1>

          {blog.description && (
            <p className="mt-3 text-muted-foreground text-lg break-words">
              {blog.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-muted-foreground">
            {blog.publishedDate && (
              <div className="flex items-center gap-1 shrink-0">
                <Calendar className="h-4 w-4" />
                <span className="whitespace-nowrap">
                  {new Date(blog.publishedDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {blog.readingTime && (
              <div className="flex items-center gap-1 shrink-0">
                <Clock className="h-4 w-4" />
                <span className="whitespace-nowrap">
                  {t('readingTime', { time: blog.readingTime?.toString() })}
                </span>
              </div>
            )}
          </div>

          {/* TAGS */}
          <div className="flex flex-wrap gap-2 mt-6">
            {blog.tags.map((tag) => (
              <Link key={tag.id} href={`/blogs?tag=${tag.slug}`}>
                <Badge
                  variant="secondary"
                  className="hover:bg-primary/10 transition"
                >
                  <TagIcon className="h-3 w-3 mr-1 shrink-0" />
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>

          {/* COVER */}
          {blog.coverImage && (
            <div className="mt-8 mb-10 overflow-hidden rounded-xl border">
              <img
                src={blog.coverImage.url}
                alt={blog.title}
                className="w-full h-auto object-cover aspect-video"
              />
            </div>
          )}

          {/* CONTENT */}
          <article className="w-full max-w-[calc(100vw-6rem)] md:max-w-none min-w-0 overflow-hidden break-words">
            {' '}
            <RichText content={blog.content} />
          </article>

          {/* PROJECT CARD */}
          {blog.project && (
            <>
              <Separator className="my-10" />
              <div className="pb-10">
                <p className="text-sm font-semibold text-muted-foreground mb-3">
                  {t('relatedProject')}
                </p>
                <Card className="p-4 hover:border-primary/50 transition group overflow-hidden">
                  <Link
                    href={blog.project.githubLink!}
                    target="_blank"
                    className="block min-w-0"
                  >
                    <div className="flex items-center gap-2 text-primary">
                      <FolderCode className="h-4 w-4 shrink-0" />
                      <span className="font-semibold text-sm truncate">
                        {blog.project.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic break-words">
                      {blog.project.description}
                    </p>
                  </Link>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </BlogDetailsShell>
  );
}
