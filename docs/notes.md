# The notes system

Everything the private vault is made of: the data model, the three surfaces it
is read through, and the decisions that are load-bearing enough that changing
them breaks something non-obvious.

Read [AGENTS.md](../AGENTS.md) first — this document assumes its layering rules
and its server API conventions. Diagrams for the wider app live in
[architecture.md](./architecture.md).

---

## 1. The constraint that shapes everything

The vault is **identity**-gated, not role-gated. `getAuthenticatedAdmin()` calls
`isSiteOwnerEmail()`, so even a second `ADMIN` row cannot enter. Every note
server action calls `requireAdmin()` and filters `ownerId: session.id`.

That single fact explains most of the architecture below:

- Sharing could not be built by loosening a guard, so it needed a **second
  surface** with its own resolver (§8).
- The R&D ingest could not authenticate as a session, so it needed a **token
  route** that resolves the owner itself and passes `ownerId` explicitly (§9).
- Nothing in the vault has a public surface, so **no note action revalidates a
  cache tag** — freshness comes from TanStack Query invalidation. `create-note.ts`
  records this; do not add a `CACHE_TAGS.NOTE`, there is nothing for it to
  invalidate.

---

## 2. Data model

`packages/db/prisma/schema.prisma`.

### `Note` — one table, one tree

| Column | Why it is like that |
| --- | --- |
| `content` | Stringified Tiptap JSON. Not HTML, not markdown. |
| `plainText` | Derived from `content` **on the server, always**. What search reads. A caller may never supply it — an HTTP client is still a caller. |
| `searchVector` | Generated in SQL from `title + plain_text`. Prisma never writes it. |
| `properties` | Free-form key→**scalar** map — the note's frontmatter. Serialized to real YAML only at export. |
| `status` | Free-form workflow state (`draft`, `active`, …). Groupable. **Not** the trash mechanism. |
| `isFolder` | A pure container: no document of its own, excluded from search and from flat/grouped views. |
| `archivedAt` | The trash. Nullable timestamp, never a status value. |
| `parentId` + `position` | Self-relation, `onDelete: Cascade`. `position` only has to order, not to be contiguous. |

**`plainText` is derived, never accepted.** This is the contract `update-note.ts`
exists to hold: the two can never disagree, and a caller cannot poison the
search index with text the document does not contain.

**`searchVector` uses the `simple` config on purpose.** The corpus is mixed
EN/VI and language stemming would lie — measured, `đây` stems to `đâi` and `máy`
to `mái`. Since `widen_note_search_vector` it concatenates **two** vectors: the
text as written, plus the same text with joining punctuation turned into
spaces, so `apps/web/src` is findable both whole and as its parts.

### `NoteLink` — the graph, rebuilt not patched

`(sourceId, targetId)` composite key. Rebuilt from the document on **every**
write; never incrementally patched. The document is the single source of truth
for what it links to.

### `NoteLabel` / `NoteOnLabel`

Owner-scoped, `@@unique([ownerId, name])`. `setNoteLabels` has **replace**
semantics — the input is the complete next label set, not a delta.

### `NoteShare` — a grant bound to an address

Bound to the **email**, not to a `User` row: it is issued before the recipient
has ever signed in, and may be issued to someone who never does. `recipientId`
is claimed on first visit. `role` is a `String`, narrowed **fail-closed**: only
an exact `"EDITOR"` grants write, so a value a future migration writes that this
code has not seen reads as VIEWER.

Inheritance is **never materialised**. See §8.

---

## 3. Three surfaces

| Route | Who | Built from |
| --- | --- | --- |
| `/[locale]/(protected)/space/notes` | the owner | `widgets/dashboard/space-shell`, `space-hub`, `note-manager`, `space-graph` |
| `/[locale]/(shared)/shared/notes` | a recipient | `widgets/shared/shared-note-workspace` |
| `/[locale]/(protected)/print/notes/[id]` | the owner, for paper | one server-rendered note |

The print route is worth knowing about: it imports `@byte-of-me/ui/math-renderer`
and `@byte-of-me/ui/rich-text` by **subpath**, not through the package barrel,
because both are leaves and the barrel would pull the whole UI package onto a
page that renders one note. Its metadata sets `robots: { index: false, … }` —
private notes must never be indexed.

---

## 4. The document

`packages/ui/src/rich-text-editor/tiptap/`.

Three modules, and the split between them is a bundle boundary, not taste:

| Module | Runs | Contains |
| --- | --- | --- |
| `rich-text-editor.tsx` | client | the full editor: node views, upload plumbing, placeholder, search & replace |
| `render-extensions.ts` | **server only** | the same schema minus editor-only parts, for `generateHTML` |
| `rich-text-markdown.ts` | **server only** | markdown → Tiptap JSON, for the R&D ingest |

`render-extensions.ts` carries an invariant worth restating: **every node and
mark the editor can persist must be represented there, with the same name and
attributes**, or `generateHTML` throws and the content falls back to escaped
plain text. That failure mode has already bitten once — the math nodes were
missing, `renderRichTextHtml` caught the throw, and because the input was an
*object* `escapeHtml` returned `''`. A note containing a single `$x$` rendered
as a **completely blank document** on every server surface.

### Math

`$…$` is inline, `$$…$$` is block. This **overrides the upstream default**,
where `$$` is inline and `$$$` is block — see `extensions/math.ts`. The Obsidian
/ Jupyter convention won because that is what the notes are written against.

The stored node carries `latex` as an attribute; the server emits it as
`data-latex` rather than rendered KaTeX, because KaTeX's markup is a deep span
tree positioned entirely with inline `style`, and `sanitize.ts` drops `style` on
purpose. The client turns those placeholders into formulas. Anything rendering
that HTML without the client pass shows LaTeX source — legible and honest
rather than blank.

### Mermaid

A fenced block with `language-mermaid` survives to the client, where
`mermaid-blocks.tsx` enhances it. `render-extensions.ts` registers ~37 lowlight
grammars server-side only, so unknown languages fall through with their
`language-*` class intact — which is exactly what the enhancer keys on.

### Markdown in and out

- **Out:** `use-note-export.ts` → `buildMarkdownFile(note, api.getMarkdown())`.
  Needs the **live editor**, because only markdown has to serialize the document
  the author is looking at right now. Frontmatter is built by
  `note-frontmatter.ts`, which quotes a scalar exactly when leaving it bare
  would change its **type** on the way back in — a note titled `no` must not
  return as `false`.
- **In:** `parseMarkdownToTiptap` (`rich-text-markdown.ts`), used only by the
  R&D ingest. Measured behaviour: headings, marks, links (relative hrefs
  preserved), tables and fenced code with language all survive; **task lists
  lose their checked state**, which is why the R&D format bans them outright
  rather than accepting a silent downgrade.

---

## 5. Links and the graph

`entities/note/model/note-links.ts`.

A note-to-note link is an **ordinary Tiptap link mark whose href is the note's
own route** — `/space/notes/<id>`. No custom node, no `data-note-id`.

Two reasons, both load-bearing:

1. `sanitize.ts` allows `href` and restricts schemes to http/https/mailto/tel. A
   relative path carries no scheme, so it survives sanitization untouched and no
   attribute has to be added to a security-critical allowlist.
2. **A link anchored to an id does not break when the target is renamed** —
   the exact failure mode `[[Wiki Title]]` syntax has. The link *text* is
   whatever the author saw at insert time; the panel resolves current titles
   from the database.

`extractNoteLinkIds` walks the JSON rather than rendered HTML — the document is
already structured, and parsing HTML back out would mean trusting the renderer
to be lossless about exactly the attribute that matters. The walk is
**iterative with a `seen` set**: the document is author-controlled data that has
already round-tripped through the database, and a cyclic or pathologically deep
one must not blow the stack inside a server action.

### The rebuild contract

On every write: delete all rows for `sourceId`, then insert the current set.
Self-links are dropped. Targets are filtered to the same owner — an href is
author-supplied text, so a pasted link to someone else's note must not become an
edge.

**Anything that writes `content` directly owes this rebuild itself.**
`update-note.ts` does it; `publish-rnd-project.ts` bypasses `updateNote` and so
performs the same rebuild explicitly. Gating that rebuild on "did the content
change" rather than "did a write happen" is a bug: delete a link between two
publishes and the rewrite becomes a no-op, `deleteMany` never runs, and the
phantom edge survives forever.

### `getNoteGraph`

Two queries, not a join — a join would repeat every node's title once per edge
it touches. Folders are excluded (no document, so no links); archived notes are
excluded (the graph is a picture of live thinking). `degree` is computed from
the edges that **survive** that filter, so a note whose only neighbour is in the
bin correctly reads as unlinked.

---

## 6. Search

`entities/note/api/search-notes.ts`.

`websearch_to_tsquery` does the parsing — quoted phrases and `-exclusion` work —
and only its *output* is rewritten, turning the **last** term into a prefix.
That distinction is what makes the rewrite safe: `to_tsquery` throws on
malformed input, `websearch_to_tsquery` does not.

`COUNT_CAP = 1000`. An exact `count(*)` visits every matching row, which is the
one part of this search that does not scale: measured on 50k synthetic notes, a
term present in every row cost **843ms** to count and **4.1ms** capped, while
the index lookup itself stayed at 0.1ms. A caller that hits the cap should read
it as "at least this many".

---

## 7. The explorer

Three views over one tree: **tree**, **flat**, **grouped**.

`get-notes-page.ts` is the flat list, cursor-paginated. Every order is
**total** — pinned first, the chosen sort, then `id`. The `id` tiebreak is not
decoration: `updatedAt` ties constantly (one bulk edit stamps a whole batch
identically), two rows tying on the sort column may come back in either order
between requests, and a cursor into that order skips or repeats rows at every
page boundary.

The sort lives server-side because a client can only order what it already
holds. Sorting a *window* client-side orders that window and nothing else, so
page 2 could contain a row belonging at the top of page 1.

`isFolder: false` is part of the query, not a filter over the result — filtering
after the fact would make the page size lie.

Related reads: `get-note-children`, `get-note-ancestors` (breadcrumbs),
`get-note-group-summaries` + `get-notes-in-group` (grouped view),
`get-descendant-count` (delete confirmations), `get-space-stats` (the hub).

---

## 8. Sharing

`entities/note-share/`.

### `resolveNoteAccess` is the whole security boundary

`lib/resolve-note-access.ts`. Every read on the shared surface, and its one
write, calls it **on the note they are about**. A recursive CTE walks *up* the
tree looking for a grant.

That upward walk is what removes an entire class of bug: there is no subtree
check to forget, because the walk has already answered it. It is also why **no
action may ever accept a `rootId` from the client**.

Note the import comment in that file: it imports from the module path, not from
`@/entities/note-share`, because that barrel re-exports `./api`, whose actions
import this very file — going through it would close a cycle between the slice
barrel and its own api layer.

It is deliberately **not** wrapped in React `cache()`: every caller is a server
action, which is its own request that resolves access exactly once, so the
memoisation would buy nothing while pulling a React request-context dependency
into a module `bun test` must import outside any render.

### Live inheritance

Permission on a folder covers its subtree, resolved by walking up at read time —
**never materialised into a row per descendant**. That is what makes moving a
note into or out of a shared folder correct with nothing to synchronise, and
leaves a delete no orphaned grant to clean up.

Consequences the UI has to handle, which is what `get-move-share-exposure` and
`get-note-share-exposure` are for: moving a note **into** a shared folder grants
access (and the owner must acknowledge it first), moving it **out** revokes
immediately.

### Leak surface beyond the body

Sharing a note is not just sharing its content. `getNoteAncestors` would leak
parent folder titles, `getNoteLinks` would leak the titles of notes linking *to*
it, `getNoteGraph` the shape of the whole vault, `searchNotes` anything matching
a query. Hence `get-shared-note-ancestors` / `get-shared-note-children` as
separate, share-aware reads — **default-deny**: a read path that has not been
made share-aware simply does not exist on that surface.

`model/rewrite-note-links.ts` strips link marks pointing outside the shared
subtree, so the stored document's own hrefs cannot leak ids either.

---

## 9. The R&D ingest

The one write path that is not a session action. Full format documentation lives
in the `rnd-notebook` skill at `~/.claude/skills/rnd-notebook/`; this section is
the repo side only.

```
docs/rnd/*.md  ──rnd-publish──▶  POST /api/rnd/publish
                                       │ bearer token, fail-closed
                                       ▼
                         publish-rnd-project (one transaction)
                                       │
        ensureNoteFolderPath ──▶ upsert per file ──▶ link pass ──▶ archive
```

**Auth.** `RND_PUBLISH_TOKEN` + `RND_PUBLISH_OWNER_EMAIL`, both `.optional()` in
`env.ts` so a deployment that has never heard of them still boots — which is
exactly why an unset token must **lock** the route rather than open it.
`isAuthorizedRndToken` returns false on a falsy configured value before any
comparison, and compares length **before** `timingSafeEqual`, because that
function throws on mismatched buffers and the throw is itself a length oracle.

**Identity is `properties.rnd_project` + `properties.rnd_path`, both halves.**
`rnd_path` is relative to `docs/rnd/`, so every project has a `00-overview.md`;
keyed on the path alone, one project's publish would reach into another's notes —
most destructively in the archive pass. Keying on `parentId` instead would fork
a second note whenever a file moves between directories, turning a move into a
delete-plus-create. Hence the update branch also re-parents.

Both keys are refused if a client supplies them (`rnd-publish-schema.ts`).

**Deletion is archive, never destroy.** And the client, not the server, decides
what was deleted: the vault cannot infer it, since a file that stops appearing
in the payload is indistinguishable from a partial publish. `rnd-publish` keeps
`.rnd-published.json` and writes it **only after a successful response** — one
written before the send would, on a failed publish, convince the next run that
undelivered files are already in the vault.

`publish-rnd-project.ts` and `ensure-note-folder-path.ts` are the **only two
files in `entities/note/api/` that are not server actions** — no `'use server'`,
no `requireAdmin()`. Both carry a header comment saying so. `publish-rnd-project`
is also deliberately **absent from the api barrel**: it has no `'use server'`
shield, and starring it in drags `prisma` into client bundles and breaks the
build. Import it by path.

---

## 10. Traps

Ranked by how expensive they were to find.

1. **`render-extensions.ts` must mirror the editor's schema.** A missing node
   type does not degrade — it blanks the document on every server surface.
2. **Writing `content` without rebuilding `NoteLink` leaves a stale graph**, and
   gating that rebuild on "content changed" leaves phantom edges forever.
3. **Never `git add -A` near this repo.** Unrelated in-flight work gets swept in.
4. **Layout wrappers use `overflow-x-clip`, not `overflow-hidden`** — the latter
   silently kills `position: sticky`, which the explorer and toolbar rely on.
5. **Do not import the `@/entities` root barrel from a client component.** It
   re-exports every entity and drags server-rendering modules into the browser.
6. **`unstable_cache` keys must include every closure-captured argument.** A key
   omitting `page` serves page 1 forever.
7. **A list row must not double as an edit form's `initialData`.** See AGENTS.md
   §8 — blogs had exactly this coupling and dropping a column would have let a
   save overwrite a published post.
8. **Prisma migrations here are applied by hand.** `prisma migrate dev` offers
   only a production reset once checksums drift; use a migration folder plus
   `db execute` plus `migrate resolve`.

---

## 11. Where things live

```
packages/db/prisma/schema.prisma          Note, NoteLink, NoteLabel, NoteShare
packages/ui/src/rich-text-editor/         editor, render-extensions, math, citations
packages/ui/src/rich-text-render.ts       stored JSON → sanitized HTML (server)
packages/ui/src/rich-text-markdown.ts     markdown → stored JSON (server)

apps/web/src/entities/note/api/           22 server actions + 2 token-auth services
apps/web/src/entities/note/model/         schema, types, note-links, rnd-links, query keys
apps/web/src/entities/note-share/         grants, resolver, share-aware reads

apps/web/src/features/dashboard/note-*    editor, explorer, search, graph, links,
                                          properties, actions
apps/web/src/widgets/dashboard/           space-shell, space-hub, note-manager, space-graph
apps/web/src/widgets/shared/              shared-note-workspace

apps/web/src/app/[locale]/(protected)/space/notes    owner surface
apps/web/src/app/[locale]/(shared)/shared/notes      recipient surface
apps/web/src/app/[locale]/(protected)/print/notes    print view
apps/web/src/app/api/rnd/publish/route.ts            token ingest
```
