// Subpath imports, not the package barrel: both of these are leaves, and the
// barrel would pull the whole UI package — TipTap included — onto a page that
// renders one article.
import { MathRenderer } from '@byte-of-me/ui/math-renderer';
import { RichText } from '@byte-of-me/ui/rich-text';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

// The PUBLIC read, by deep path exactly as `(public)/blogs/[slug]/page.tsx`
// imports it. `getPublicBlogBySlug` queries
// `blog.findUniqueOrThrow({ where: { slug, isPublished: true } })`, so a draft
// is not "found and then hidden" — it is outside the query's result set, and
// the throw is caught into `{ success: false }` by `handlePublicAction`.
// There is deliberately no admin equivalent reachable from this route.
import { getPublicBlogBySlug } from '@/entities/blog/api/get-public-blog-by-slug';
import { BlogPrintTrigger } from '@/features/public/blog-print';
import { formatDate, isMeaningfullyUpdated } from '@/shared/lib/utils';

const BASE_METADATA: Metadata = {
  // Not indexable, for the same reason the notes print view is not: this is a
  // second URL for an article that already has a canonical one, and letting a
  // crawler have it splits the post between two results.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/**
 * The title becomes the PDF's default filename in Chrome's save dialog, so it
 * is worth getting right — "Blog" for every export would be useless.
 *
 * `absolute`, so the locale layout's `%s | Byte of me` template does not end
 * up in the filename of every exported article.
 *
 * Resolving it here leaks nothing: the only titles reachable are those of
 * published posts, which are already on the public site. An unpublished or
 * unknown slug falls through to the generic label and the page below 404s.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = await getPublicBlogBySlug(slug);
  const title = res.success ? res.data.title.trim() : '';

  return { ...BASE_METADATA, title: { absolute: title || 'Blog' } };
}

/**
 * The printable article.
 *
 * Rendered with `RichText` — the SERVER component — not the editor. It goes
 * through `render-extensions.ts`, so KaTeX markup, tables and images all come
 * out as static HTML and no editor JavaScript reaches the page at all. That
 * is what makes the resulting PDF text-true rather than a screenshot: Chrome
 * is laying out real glyphs from real fonts, and the `@media print` rules in
 * `globals.css` ARE the page layout.
 *
 * `MermaidBlocks` is deliberately absent even though the on-site article
 * renders inside it: it swaps code blocks for drawn SVGs after hydration,
 * which nothing here can wait for — `?print=1` fires on `document.fonts.ready`
 * and would race it. A mermaid block exports as its source, which is at least
 * deterministic.
 */
export default async function BlogPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const [{ slug, locale }, { print }] = await Promise.all([
    params,
    searchParams,
  ]);
  const [res, t] = await Promise.all([
    getPublicBlogBySlug(slug),
    getTranslations('blogDetails'),
  ]);

  // No distinction between "unknown slug" and "not published" — both are 404,
  // the same discipline the public detail route follows. Anything else would
  // turn this URL into an oracle for unreleased posts.
  if (!res.success) notFound();

  const blog = res.data;
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  const publishedOn = blog.publishedDate ?? blog.createdAt;
  const updatedLabel = isMeaningfullyUpdated(publishedOn, blog.updatedAt)
    ? t('updatedOn', {
        date: formatDate(blog.updatedAt, locale, dateOptions) ?? '',
      })
    : null;

  return (
    // A plain wrapper, NOT a `prose` container: `RichText` renders its own
    // `<article class="prose …">`, and nesting one inside another makes the
    // typography variables resolve twice.
    <div>
      <h1 className="mb-1 text-3xl font-bold">{blog.title}</h1>

      <p className="mb-8 mt-0 text-xs text-muted-foreground">
        {[
          blog.author?.name,
          formatDate(publishedOn, locale, dateOptions),
          updatedLabel,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <RichText content={blog.content} />

      {/* Before the print trigger below, deliberately: it renders the maths
          (and so requests the KaTeX fonts) that the trigger's
          `document.fonts.ready` wait then has something to wait for. */}
      <MathRenderer />

      {/* Only the article's action bar (`?print=1`) opens the dialog by
          itself; a bare visit to this URL renders a readable page with a
          button. */}
      <BlogPrintTrigger auto={print === '1'} />
    </div>
  );
}
