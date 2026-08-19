'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@byte-of-me/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  getNoteShares,
  noteShareKeys,
  type NoteShareRole,
  revokeNoteShare,
  shareNote,
  updateNoteShareRole,
} from '@/entities/note-share';

interface ShareNoteDialogProps {
  noteId: string;
  title: string;
  /** Changes the wording only — a folder grant keeps covering what moves in. */
  isFolder: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Who can reach this note, and on what terms.
 *
 * Split the same way `DeleteNoteDialog` is, for the same measured reason: the
 * menus have to render this unconditionally with `open` as a prop (Radix
 * unmounts a menu's content on select, so a dialog owned by the menu would
 * close with it), which used to mount the grant list and all three mutation
 * observers with the ROW. A desktop row renders two menu surfaces, so that was
 * six idle mutation observers and two query observers per row before anyone
 * touched a menu.
 *
 * `ShareNoteDialogBody` sits inside `DialogContent`, which Radix mounts only
 * while the dialog is open — so a closed dialog is a `Dialog` root and nothing
 * else. Conditional rendering at the call site would achieve the same and lose
 * the exit animation `DialogContent` declares; see `DeleteNoteDialog` for the
 * full argument and the numbers.
 *
 * One behavioural consequence, and it is the wanted one: the invite field and
 * the role select now reset each time the dialog opens, rather than carrying a
 * half-typed address from the last time it was closed.
 */
export function ShareNoteDialog(props: ShareNoteDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {/*
        `min-w-0` on every child that has to shrink, and it is load-bearing.
        `DialogContent` is `grid w-full max-w-lg`, and a grid item's default
        `min-width: auto` means it cannot shrink below its own min-content
        width. An email address is one unbreakable token, so a long one sized
        the column past the dialog and pushed `Invite` and `Remove access`
        outside the panel — measured: 652px of content in a 512px dialog.
        It also explains why the invite row looked fine until the first grant
        appeared: nothing had forced the column wide yet.
      */}
      <DialogContent>
        <ShareNoteDialogBody
          noteId={props.noteId}
          title={props.title}
          isFolder={props.isFolder}
          open={props.open}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The grant list, the invite form and the three mutations behind them.
 *
 * Mounted and unmounted by Radix along with the dialog it fills.
 */
function ShareNoteDialogBody({
  noteId,
  title,
  isFolder,
  open,
}: Omit<ShareNoteDialogProps, 'onOpenChange'>) {
  const t = useTranslations('dashboard.note.share');
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<NoteShareRole>('VIEWER');

  const shares = useQuery({
    queryKey: noteShareKeys.shares(noteId),
    queryFn: async () => {
      const res = await getNoteShares(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: open,
  });

  /**
   * One helper for all three mutations. Each of them changes the grant list
   * AND what the delete/move confirmations report, and those two key families
   * do not nest — `noteShareKeys.shares` cannot prefix-match
   * `noteShareKeys.exposure`, so invalidating one never reaches the other.
   */
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: noteShareKeys.sharesAll() });
    void queryClient.invalidateQueries({
      queryKey: noteShareKeys.exposureAll(),
    });
  };

  const invite = useMutation({
    mutationFn: async () => {
      const res = await shareNote({ noteId, email, role });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    onSuccess: () => {
      setEmail('');
      invalidate();
    },
  });

  const changeRole = useMutation({
    mutationFn: async (next: { shareId: string; role: NoteShareRole }) => {
      const res = await updateNoteShareRole(next);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    onSuccess: invalidate,
  });

  const revoke = useMutation({
    mutationFn: async (shareId: string) => {
      const res = await revokeNoteShare(shareId);
      if (!res.success) throw new Error(res.errorMsg);
    },
    onSuccess: invalidate,
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('title', { title })}</DialogTitle>
        <DialogDescription>
          {/* The folder wording says the quiet part out loud: a folder grant
              keeps covering whatever is moved in later. That is the one
              consequence of live inheritance an owner cannot infer from the
              UI, so it is stated where the decision is made. */}
          {isFolder ? t('descriptionFolder') : t('descriptionNote')}
        </DialogDescription>
      </DialogHeader>

      <form
        className="flex min-w-0 flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (email.trim()) invite.mutate();
        }}
      >
        <Input
          type="email"
          required
          value={email}
          aria-label={t('emailLabel')}
          placeholder={t('emailPlaceholder')}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div className="flex gap-2">
          <Select
            value={role}
            onValueChange={(next) => setRole(next as NoteShareRole)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VIEWER">{t('roleViewer')}</SelectItem>
              <SelectItem value="EDITOR">{t('roleEditor')}</SelectItem>
            </SelectContent>
          </Select>
          {/* The spinner, not just the disabled state. Inviting sends mail,
              so it is the slowest button in the app — several seconds when
              the SMTP host is unhappy — and a button that only greys out
              reads as "nothing happened", which is what invites a second
              click on a request already in flight. */}
          <Button type="submit" disabled={invite.isPending}>
            {invite.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            {t('invite')}
          </Button>
        </div>
      </form>

      {invite.error ? (
        <p className="text-sm text-destructive">{invite.error.message}</p>
      ) : null}

      {shares.isPending ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : null}
      {shares.isError ? (
        <p className="text-sm text-destructive">{t('failed')}</p>
      ) : null}
      {shares.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : null}

      <ul className="flex min-w-0 flex-col gap-2">
        {shares.data?.map((share) => (
          <li key={share.id} className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">
              {share.email}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {share.accepted ? t('accepted') : t('pending')}
            </span>
            <Select
              value={share.role}
              // Pending state is matched to THIS row, not to the mutation as
              // a whole: `changeRole.isPending` is true for whichever row is
              // in flight, and using it bare would freeze every row's select
              // while one of them saved.
              disabled={
                changeRole.variables?.shareId === share.id &&
                changeRole.isPending
              }
              onValueChange={(next) =>
                changeRole.mutate({
                  shareId: share.id,
                  role: next as NoteShareRole,
                })
              }
            >
              <SelectTrigger className="w-32 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIEWER">{t('roleViewer')}</SelectItem>
                <SelectItem value="EDITOR">{t('roleEditor')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive"
              // Same per-row scoping as the select above.
              disabled={revoke.variables === share.id && revoke.isPending}
              onClick={() => revoke.mutate(share.id)}
            >
              {revoke.variables === share.id && revoke.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {t('revoke')}
            </Button>
          </li>
        ))}
      </ul>

      {/* A failed revoke or role change looks EXACTLY like a successful one:
          the list is re-read from the server, so the row simply stays as it
          was, and the author walks away believing access is gone when it is
          not. `role="alert"` because nothing else on screen moves — unlike
          the invite above, which at least has a spinner and a cleared field
          to say something happened. */}
      {revoke.error ? (
        <p role="alert" className="text-sm text-destructive">
          {t('revokeFailed')} — {revoke.error.message}
        </p>
      ) : null}
      {changeRole.error ? (
        <p role="alert" className="text-sm text-destructive">
          {t('roleFailed')} — {changeRole.error.message}
        </p>
      ) : null}
    </>
  );
}
