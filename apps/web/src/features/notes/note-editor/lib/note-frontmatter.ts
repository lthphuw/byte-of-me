import {
  type NoteDetail,
  type NotePropertyValue,
  parseNoteProperties,
} from '@/entities/note';

/**
 * The keys this module emits itself. A custom property may not shadow one:
 * `properties` is author-editable free-form data, so it can absolutely
 * contain a key called `status`, and emitting it would produce a duplicate
 * mapping key — invalid YAML, and whichever parser wins reports the wrong
 * value back.
 */
const RESERVED_KEYS = new Set([
  'title',
  'status',
  'created',
  'updated',
  'labels',
]);

/**
 * A YAML scalar, quoted exactly when it has to be.
 *
 * Bare reads better, so bare is the default — but a string carrying YAML
 * punctuation, or one YAML would parse back as a boolean/number/null, has to
 * be quoted or the round trip silently changes its TYPE rather than its
 * value. A note whose status is the text `12` comes back as the number
 * twelve; one titled `no` comes back as `false`.
 */
export function toYamlScalar(value: NotePropertyValue): string {
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }

  // A scalar occupies one line. A stored newline would break the document's
  // shape rather than just the value, so it collapses to a space.
  const flat = value.replace(/\s*\n\s*/g, ' ');

  const needsQuotes =
    flat === '' ||
    flat !== flat.trim() ||
    /[:#\-?,[\]{}&*!|>'"%@`]/.test(flat) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(flat) ||
    /^-?\d+(\.\d+)?$/.test(flat);

  if (!needsQuotes) return flat;
  return `"${flat.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * The note's YAML frontmatter block, fences included.
 *
 * Fixed keys first and always in the same order, so a diff between two
 * exports of one note shows content changes rather than key reordering. The
 * author's own `properties` follow, minus anything that would collide.
 */
export function buildFrontmatter(note: NoteDetail): string {
  const lines = ['---'];
  lines.push(`title: ${toYamlScalar(note.title)}`);
  lines.push(`status: ${toYamlScalar(note.status)}`);
  lines.push(`created: ${note.createdAt.toISOString()}`);
  lines.push(`updated: ${note.updatedAt.toISOString()}`);

  if (note.labels.length > 0) {
    const names = note.labels.map((label) => toYamlScalar(label.name));
    lines.push(`labels: [${names.join(', ')}]`);
  }

  for (const [key, value] of Object.entries(
    parseNoteProperties(note.properties)
  )) {
    if (RESERVED_KEYS.has(key)) continue;
    lines.push(`${key}: ${toYamlScalar(value)}`);
  }

  lines.push('---');
  return lines.join('\n');
}

/** Frontmatter, a blank line, the markdown body, exactly one trailing newline. */
export function buildMarkdownFile(note: NoteDetail, body: string): string {
  return `${buildFrontmatter(note)}\n\n${body.replace(/\s*$/, '')}\n`;
}

/**
 * A download filename.
 *
 * Only the characters a filesystem actually objects to are replaced —
 * accented and Vietnamese titles keep their letters. Transliterating to ASCII
 * would turn every Vietnamese note into `untitled.md`, which is a worse
 * outcome than a diacritic in a filename.
 */
export function noteFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[/\\?%*:|"<>.,;=+#]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '');

  return `${slug || 'untitled'}.md`;
}
