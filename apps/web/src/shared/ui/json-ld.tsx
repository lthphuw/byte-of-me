import type { JsonLdObject } from '@/shared/lib/metadata';

/**
 * Renders a schema.org payload as a JSON-LD script tag.
 *
 * `</script>`-safe: every `<` in the serialized payload is escaped, so stored
 * content (a blog title, a description typed in the dashboard) can never close
 * the tag early and inject markup.
 */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
