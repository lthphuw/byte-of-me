/**
 * The blog card shows its title, description and tag names in the dashboard's
 * locale, then English; a tag with no name shows its slug, never its id.
 * It renders with no cover, so `next/image` is never reached.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so only a relative path reaches it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../messages/en.json';

import { BlogEditorCard } from './blog-editor-card';

import type { AdminBlogListItem } from '@/entities/blog';

const BLOG_ID = 'cl9ebqhxk00003b600tymydho';
const date = new Date('2026-01-01T00:00:00.000Z');

type TagLink = AdminBlogListItem['tags'][number];

/** A tag link as the admin list returns it: `names` maps each locale to its name. */
function tagLink(
  id: string,
  slug: string,
  names: Record<string, string>
): TagLink {
  return {
    blogId: BLOG_ID,
    tagId: id,
    createdAt: date,
    updatedAt: date,
    tag: {
      id,
      slug,
      createdAt: date,
      updatedAt: date,
      translations: Object.entries(names).map(([language, name]) => ({
        id: `${id}-${language}`,
        language,
        name,
      })),
    },
  };
}

type BlogTranslation = AdminBlogListItem['translations'][number];

function blogWith(
  tags: TagLink[],
  translations: BlogTranslation[] = [
    { id: 'bt-en', language: 'en', title: 'Hello world', description: null },
  ]
): AdminBlogListItem {
  return {
    id: BLOG_ID,
    createdAt: date,
    updatedAt: date,
    slug: 'hello-world',
    publishedDate: null,
    isPublished: false,
    userId: 'user-1',
    projectId: null,
    readingTime: null,
    coverImageId: null,
    coverImage: null,
    project: null,
    translations,
    tags,
  };
}

function renderCard(blog: AdminBlogListItem, locale: 'en' | 'vi') {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={{
        dashboard: { blog: en.dashboard.blog, shared: en.dashboard.shared },
      }}
    >
      <BlogEditorCard
        blog={blog}
        onEdit={mock(() => {})}
        onDelete={mock(() => {})}
      />
    </NextIntlClientProvider>
  );
}

afterEach(cleanup);

describe('BlogEditorCard tags', () => {
  it('names each tag in the dashboard locale, and in English where that locale has none', () => {
    const { getByText, queryByText } = renderCard(
      blogWith([
        tagLink('tag-ts', 'typescript', {
          en: 'TypeScript',
          vi: 'Kiểu dữ liệu',
        }),
        tagLink('tag-vue', 'vue', { en: 'Vue' }),
      ]),
      'vi'
    );

    expect(getByText('Kiểu dữ liệu')).toBeTruthy();
    expect(queryByText('TypeScript')).toBeNull();
    expect(getByText('Vue')).toBeTruthy();
  });

  it('falls back to the slug, never the internal id, for a tag with no name', () => {
    const { getByText, queryByText } = renderCard(
      blogWith([tagLink('cl9ebqhxk00009b600tymydzz', 'deep-dive', {})]),
      'en'
    );

    expect(getByText('deep-dive')).toBeTruthy();
    expect(queryByText('cl9ebqhxk00009b600tymydzz')).toBeNull();
  });
});

describe('BlogEditorCard title and description', () => {
  const english: BlogTranslation = {
    id: 'bt-en',
    language: 'en',
    title: 'Hello world',
    description: 'An English summary',
  };
  const vietnamese: BlogTranslation = {
    id: 'bt-vi',
    language: 'vi',
    title: 'Xin chào thế giới',
    description: 'Tóm tắt tiếng Việt',
  };
  // English is listed first: taking the first row would show it under 'vi'.
  const bilingual = [english, vietnamese];

  it('shows the title and description in the dashboard locale', () => {
    const { getByText, queryByText } = renderCard(
      blogWith([], bilingual),
      'vi'
    );

    expect(getByText('Xin chào thế giới')).toBeTruthy();
    expect(getByText('Tóm tắt tiếng Việt')).toBeTruthy();
    expect(queryByText('Hello world')).toBeNull();
    expect(queryByText('An English summary')).toBeNull();
  });

  it('shows the English title and description under English', () => {
    const { getByText, queryByText } = renderCard(
      blogWith([], bilingual),
      'en'
    );

    expect(getByText('Hello world')).toBeTruthy();
    expect(getByText('An English summary')).toBeTruthy();
    expect(queryByText('Xin chào thế giới')).toBeNull();
  });

  it('falls back to the English title and description when the locale has none', () => {
    const { getByText } = renderCard(blogWith([], [english]), 'vi');

    expect(getByText('Hello world')).toBeTruthy();
    expect(getByText('An English summary')).toBeTruthy();
  });
});
