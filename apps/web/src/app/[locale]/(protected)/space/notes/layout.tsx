import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import {
  pickMessages,
  SPACE_NOTES_MESSAGE_NAMESPACES,
} from '@/shared/i18n/messages';

/**
 * The notes module's client message catalogue, and nothing else.
 *
 * No markup: this layout renders a context provider and its children, so it
 * adds no DOM node and no box to the flex column `SpaceShell` set up. The
 * workspace's own frame still lives in `(workspace)/layout.tsx`, which is
 * where it has to live — that group exists precisely so the graph does NOT
 * render under `NoteWorkspace`.
 *
 * Mounted at `notes/` rather than inside `(workspace)/` for the mirror-image
 * reason. `space/layout.tsx` no longer carries `dashboard.note`; each module
 * carries its own leaf, because the vault's four namespaces were being
 * serialized in full on every navigation of a `force-dynamic` route group. If
 * this provider sat inside the group, `notes/graph` — a sibling of it, not a
 * member — would resolve against the shell's list instead: `SpaceGraphScreen`
 * and `notes/graph/loading.tsx` are both client components reading
 * `dashboard.note.graph`, and both would paint their key paths. One provider
 * over the whole module covers the workspace, the graph and any third view of
 * the notes added later.
 *
 * `SPACE_NOTES_MESSAGE_NAMESPACES` is the only module list that also carries
 * `dashboard.space`, and that is not conservatism — see its comment. Both
 * screens here draw `SpaceNavTrigger` from inside their own tree, so it
 * resolves against THIS provider, not the shell's.
 */
export default async function NotesModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = pickMessages(
    await getMessages(),
    SPACE_NOTES_MESSAGE_NAMESPACES
  );

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
