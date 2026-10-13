import type { CompanyFormValues } from '@/entities/company/model/company-schema';

type Role = CompanyFormValues['roles'][number];

/**
 * Whether removing a role would lose something: a title or description in any
 * language, or a task. Dates alone do not count.
 */
export function roleHasContent(
  role: Pick<Role, 'translations' | 'tasks'>
): boolean {
  return (
    role.tasks.length > 0 ||
    role.translations.some((t) =>
      Boolean(t.title.trim() || t.description?.trim())
    )
  );
}
