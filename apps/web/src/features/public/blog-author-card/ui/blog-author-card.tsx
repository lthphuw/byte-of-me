import { Avatar, AvatarFallback, AvatarImage, Card } from '@byte-of-me/ui';
import { getTranslations } from 'next-intl/server';

import type { BlogAuthor } from '@/entities/blog';
import { getPublicUserProfile } from '@/entities/user-profile/api/get-public-user-profile';
import { SectionLoadError } from '@/shared/ui';

export async function BlogAuthorCard({
  author,
  label,
}: {
  author?: Maybe<BlogAuthor>;
  label: string;
}) {
  const resp = await getPublicUserProfile();
  const tError = await getTranslations('components.sectionLoadError');
  // A failed profile read is an error even when the post's author is known.
  if (!resp.success) {
    return (
      <SectionLoadError
        title={tError('title')}
        description={tError('description')}
      />
    );
  }
  const profile = resp.data;

  const name = author?.name || profile?.displayName || '';
  const bio = profile?.bio;

  if (!name && !bio) return null;

  return (
    <Card className="flex items-start gap-4 p-5">
      <Avatar className="h-14 w-14">
        <AvatarImage src={author?.avatar ?? undefined} alt={name} />
        <AvatarFallback>{name.charAt(0).toUpperCase() || '?'}</AvatarFallback>
      </Avatar>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="font-semibold">{name}</p>
        {bio && <p className="text-sm text-muted-foreground">{bio}</p>}
      </div>
    </Card>
  );
}
