# PRD & SYSTEM SPECIFICATION: BYTE OF ME - PRIVATE SPACE

## 1. Project Context & Tech Stack Constraints

- **Application:** Byte of me (Personal Content, Portfolio Platform & Headless CMS).
- **Architecture:** Feature-Sliced Design (FSD) in a Monorepo setup (Turborepo + Bun 1.3).
- **Tech Stack:** Next.js 16+ (App Router), React 19, TypeScript 5.8, Tailwind CSS 3, shadcn/ui.
- **Data & Auth Layer:** PostgreSQL 16 (via Prisma 7 adapter-pg), Auth.js v5 (JWT sessions, `ADMIN` role required), TanStack Query v5.
- **Editor & Storage:** TipTap 3 (Rich-text), `@byte-of-me/storage` (Supabase S3).
- **Strict Requirement:** Must deeply integrate Next.js 16+ features (<https://nextjs.org/docs/app/api-reference/components>). Utilize `<Suspense>`, React Server Components (RSC), Server Actions, `loading.tsx`, and optimized data caching/revalidation to handle real-time states and hydration properly. Supports Internationalization (i18n) naturally matching the rest of the platform (Strict 2-layer i18n: next-intl for UI, database for content).
- **Responsive Design (Strict):** The entire application must be fully responsive across PC, Tablet, and Mobile devices. Complex interfaces (like the Knowledge Graph, multi-pane Editor, and Sidebars) must gracefully adapt to smaller screens (e.g., using collapsible sidebars, bottom sheets, or hidden drawers on mobile/tablet).
- **Check the skills in** `@.claude/skills`: `design-system`, `summarize-changes`, `ui-styling`, `senior-frontend`, `typescript-strict-mode`, `ui-ux-pro-max`.

## 2. Routing Structure
*Note: Routes should align with the existing `app/[locale]/(protected)/` structure.*
- **`/space`**: The root dashboard for the private workspace. Acts as the primary navigation hub. (Create a UI for it too).
- **`/space/notes`**: The core Notes module workspace.

## 3. Feature Specifications: Notes Module (/space/notes)

*Core Inspiration: Obsidian (Local-first feel, deeply interconnected thoughts, personal Wikipedia).*

### 3.1. Knowledge Graph & Linking
- **Bi-directional Linking:** Seamlessly connect ideas, people, places, and books.
- **Knowledge Graph Visualization:** Interactive graph UI mapping out relationships. Must display both linked and unlinked nodes to help discover hidden patterns. On mobile, provide a simplified full-screen or pan-and-zoom view.

### 3.2. Editor & Note Interface (The Core Experience)
- **Real-time Markdown Editor (WYSIWYG):** The primary editor (extending the existing TipTap 3 implementation) must support real-time formatting. For example, typing `# ` instantly transforms the block into an `<h1>`, `>` into a blockquote, etc. (Similar to Notion or Obsidian Live Preview).
- **Raw vs. Real-time View Toggle:** A UI toggle/tab to switch between raw Markdown source code and the real-time rendered editor view.
- **Advanced Mathematical Equations:** Deep integration for LaTeX/math rendering (using KaTeX or MathJax) inside the editor.
  - **Inline Math:** Wrap with `$...$`.
  - **Block Math:** Wrap with `$$...$$`. Must render beautifully with standard math fonts and proper alignment, updating in real-time as the user types in the formula block.
- **Frontmatter (YAML):** Support YAML metadata at the top of each note (e.g., `tags: []`, `status: draft`, `created_at`). This metadata will power the graph and grouped views.
- **Command Palette (Ctrl/Cmd + K):** A quick-action search bar to create notes, switch views, or navigate between notes without using the mouse.
- **Export & Download:** Provide options to download the current note in multiple formats.
  - **`.md` (Markdown):** Download the raw source file including Frontmatter.
  - **`.pdf` (PDF):** Download a fully rendered PDF document. The PDF export must accurately retain WYSIWYG styling, images, and rendered mathematical equations.
- **Dynamic Metadata:** Utilize Next.js `generateMetadata` to dynamically update the `<title>` tag matching the active note.

### 3.3. Note Explorer & List Views (Left Sidebar)
Redesign the left-side note list/explorer to support multiple viewing modes:
- **Default/Flat View:** Chronological or alphabetical list of all notes.
- **Grouped View:** Dynamically group notes based on Frontmatter data (e.g., grouped by Tags, Folders, or Status).
- **Drag & Drop:** Smooth drag-and-drop interactions to reorder notes or move them between different groups/folders.
- **Full-Text Search:** Search through filenames, tags, and internal markdown content with keyword highlighting.

### 3.4. Right Sidebar System
A contextual right-sidebar widget designed to display 3 main tabs:
1. **ToC:** Automatically extracted Table of Contents from the active note's headers.
2. **References:** External links and uploaded internal documents.
3. **Links (Knowledge Graph):** Incoming (backlinks) and outgoing links to other notes.

### 3.5. Document Management & Viewport
- **Direct Upload:** Upload full reference documents (e.g., PDFs) utilizing the existing `@byte-of-me/storage` package (Supabase S3).
- **In-App Viewport:** An integrated document viewer (PDF renderer) so users can read references side-by-side with their notes without opening new tabs. On mobile, this should open in a modal or overlay.

### 3.6. Sharing & Permission Handling
- **Public Link Sharing:** Generate shareable URLs. Must use a strictly separated UI view for public access that strips away all private layout elements, navigation, and sensitive metadata.
- **Email Invitation:** Secure sharing via email using the existing Nodemailer (SMTP) setup. The recipient must receive a link and explicitly accept the invitation.

### 3.7. Performance, Caching & Architecture (Next.js 16+)
- **Loading & Skeletons:** Granular skeleton loaders for individual notes using `<Suspense>` boundaries. Global `loading.tsx` for the `/space/notes` route.
- **Data Fetching & Pagination:** Cursor-based pagination or infinite scroll combined with RSC for the note list.
- **Cache Invalidation:** Implement robust caching strategies using Next.js `revalidateTag` or `revalidatePath` to ensure real-time graph updates and note saves don't cause stale data or hydration mismatches.
- **Local-First Sync (Optional but Recommended):** Mechanism to save drafts locally (IndexedDB/Local Storage) and sync to the server/PostgreSQL database in the background, ensuring smooth editing without network latency.

### 3.8. AI Integration (Future-Proofing / Plugin Architecture)
- Design the data schema and FSD components to easily accept AI agent plugins.
- **Use cases:** Context understanding, chat-model summarization, intelligent relationship/tagging suggestions based on note content.

### 3.9. Ease for non-tech
- We should add modal to show how we type the markdown: from **bold**, *italic*, to table, image, math blocks, etc.
- Provide clear visual cues and tooltips for editor features.

---

## 4. Implementation Strategy & Execution Plan

To ensure high-quality delivery, the development of this PRD will follow a strict workflow: Ideation -> Phased Planning -> Sub-Agent Delegation -> Rigorous Browser Testing.

### 4.1. Phased Planning
- **Phase 1 (Foundation):** Establish the FSD folder structure. Set up the Prisma schema (PostgreSQL) to handle bi-directional links, and configure base layouts with `next-intl` for seamless internationalization.
- **Phase 2 (The Core Engine):** Extend the existing TipTap 3 editor to support WYSIWYG Markdown parsing, real-time KaTeX/MathJax rendering, the raw/rendered toggle, and the non-tech Cheat-sheet Modal. Implement local-first syncing (IndexedDB).
- **Phase 3 (Navigation & Graph):** Implement the complex UI: Left Note Explorer (grouped views, drag-drop), Right Sidebar (ToC, references), and the interactive Knowledge Graph.
- **Phase 4 (Polish & Performance):** Implement PDF/MD export, S3 Document uploads via `@byte-of-me/storage`, finalize Server Action caching optimizations, and ensure responsive behavior.

### 4.2. Sub-Agent Delegation Strategy
To parallelize the workload effectively, tasks are conceptually divided among specialized AI sub-agents:

1. **@Agent-UI-Architect:** 
   - **Scope:** Handles FSD scaffolding, global layouts (`/space` dashboard), responsive Tailwind styling, and cross-device viewports.
   - **Focus:** Ensuring sidebars gracefully collapse into drawers/bottom sheets on mobile.
2. **@Agent-Editor-Core:** 
   - **Scope:** Focuses entirely on extending `features/editor`. 
   - **Focus:** Implements TipTap 3 Markdown parsing, real-time math rendering, the raw/rendered toggle, and the Markdown instruction modal.
3. **@Agent-Data-Flow:** 
   - **Scope:** Manages Prisma schemas, Next.js Server Actions (using `requireAdmin()`), and cache invalidation (`revalidateTag`/`revalidatePath`).
   - **Focus:** Building the local-first syncing mechanism and ensuring that rapid real-time state changes do not cause React hydration errors.
4. **@Agent-Graph-Vis:** 
   - **Scope:** Dedicated to building the Knowledge Graph widget.
   - **Focus:** Handling node relationship logic, bi-directional link mapping, and ensuring the graph is performant (pan/zoom) on both desktop and mobile.

### 4.3. Strict Testing Protocol (Chrome DevTools)
Every feature must pass strict manual testing using Google Chrome before being marked as complete. Agents must write code with these testing steps in mind:

- **Responsive & Touch Testing:** Open Chrome DevTools (F12) -> Device Toolbar. Test the UI on specific viewports: Mobile (iPhone 14 Pro), Tablet (iPad Air), and Desktop (1080p+). Verify that drag-and-drop works via touch events and the Knowledge Graph pans correctly without breaking the layout.
- **Network & Offline Resilience:** Use Chrome's Network tab to simulate "Offline" mode. Write a new note, verify it saves locally to IndexedDB/Local Storage. Switch back to "No throttling," and verify seamless background synchronization to the PostgreSQL database.
- **Performance & Hydration Verification:** Run Chrome Lighthouse audits. Monitor the Console tab strictly for any React hydration mismatch errors, especially when syncing markdown states between client and server.
- **Export Fidelity:** Generate a PDF via the export feature and open it in Chrome's native PDF viewer. Verify that KaTeX equations, embedded images, Frontmatter, and FSD-scoped Tailwind styles are perfectly retained.