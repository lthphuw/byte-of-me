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
 * The grant list and all three mutations live HERE rather than in the menu, so
 * they exist only while the dialog is open — the same reason
 * `DeleteNoteDialog` keeps its cascade count local. Every row in the tree
 * renders two menu surfaces, and mounting four queries per row for dialogs
 * nobody has opened is the cost that placement avoids.
 */
export function ShareNoteDialog({
  noteId,
  title,
  isFolder,
  open,
  onOpenChange,
}: ShareNoteDialogProps) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
          className="flex flex-col gap-2 sm:flex-row"
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
            <Button type="submit" disabled={invite.isPending}>
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

        <ul className="flex flex-col gap-2">
          {shares.data?.map((share) => (
            <li key={share.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm">
                {share.email}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {share.accepted ? t('accepted') : t('pending')}
              </span>
              <Select
                value={share.role}
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
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(share.id)}
              >
                {t('revoke')}
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
