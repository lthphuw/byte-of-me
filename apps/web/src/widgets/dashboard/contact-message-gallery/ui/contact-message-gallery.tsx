'use client';

import { useEffect, useState } from 'react';
import { contactMessageKeys } from '@byte-of-me/contracts/contact-message';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  ScrollArea,
  useDebounce,
} from '@byte-of-me/ui';
import { MessageSquare, Search, Trash2, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { ContactMessageGridSkeleton } from './contact-message-grid-skeleton';

import {
  type AdminContactMessage,
  deleteContactMessage,
} from '@/entities/contact-message';
import { useContactMessages } from '@/entities/contact-message/query';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';
import {
  ConfirmDeleteDialog,
  ManagerListState,
  ManagerPagination,
  RecordDialog,
} from '@/shared/ui';

export function ContactMessageGallery() {
  const t = useTranslations('dashboard.contactGallery');
  const tShared = useTranslations('dashboard.shared');
  const tCrud = useTranslations('dashboard.shared.crud');
  const format = useFormatter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const [selectedMessage, setSelectedMessage] =
    useState<AdminContactMessage | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data, isLoading, isError, refetch, isPlaceholderData } =
    useContactMessages(page, debouncedSearch);

  const messages = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages;

  // The last message on the last page was deleted: step back to the new last
  // page. Placeholder data is skipped, because it describes the page being left.
  useEffect(() => {
    if (totalPages === undefined || isPlaceholderData) return;
    const lastPage = Math.max(1, totalPages);
    if (page > lastPage) setPage(lastPage);
  }, [isPlaceholderData, page, totalPages]);

  const entity = t('entity');
  const deleteMutation = useServerMutation<string, null>({
    mutationFn: deleteContactMessage,
    errorMessage: tCrud('deleteError', { entity }),
    successMessage: tCrud('deleted', { entity }),
    invalidate: [contactMessageKeys.all],
    onSuccess: () => {
      setConfirmingDelete(false);
      setSelectedMessage(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t('title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>

        {!isLoading && !isError && (
          <div className="hidden rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground md:block">
            {t('messageCount', { count: meta?.totalCount || 0 })}
          </div>
        )}
      </div>

      <div className="group relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <Input
          aria-label={t('searchPlaceholder')}
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="rounded-xl border-dashed bg-background/50 pl-9 pr-11 focus:border-solid"
        />
        {search && (
          <button
            type="button"
            aria-label={t('clearSearch')}
            onClick={() => setSearch('')}
            className="absolute right-0 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground can-hover:min-h-9 can-hover:min-w-9"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Gallery */}
      <ManagerListState
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        isEmpty={messages.length === 0}
        emptyTitle={t('noMessages')}
        skeleton={<ContactMessageGridSkeleton />}
        pagination={
          <ManagerPagination
            pagination={meta}
            setPage={setPage}
            isPlaceholderData={isPlaceholderData}
          />
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {messages.map((msg) => (
            <Card
              key={msg.id}
              className="group relative rounded-2xl transition-colors focus-within:border-primary/50 hover:border-primary/50"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold transition-colors group-hover:text-primary">
                    {msg.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format.dateTime(new Date(msg.createdAt), {
                      dateStyle: 'short',
                    })}
                  </div>
                </div>
                <div className="truncate text-sm italic text-muted-foreground">
                  {msg.subject || t('noSubject')}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {msg.email}
                </div>
              </CardHeader>

              <CardContent>
                <div className="relative">
                  {/* Visitor text: a text node, never markup. */}
                  <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-7">
                    {msg.message}
                  </p>
                  {/* A real button rather than `onClick` on the card: the
                      pseudo-element stretches the hit area over the whole card
                      while keyboard and screen-reader users get one named,
                      focusable control per message. */}
                  <button
                    type="button"
                    aria-label={t('readMessageFrom', { name: msg.name })}
                    onClick={() => setSelectedMessage(msg)}
                    className="mt-4 text-sm font-medium text-primary underline underline-offset-2 after:absolute after:inset-0 focus-visible:outline-none"
                  >
                    {t('clickMore')}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ManagerListState>

      {/* Read-only detail, with delete as its one action. */}
      <RecordDialog
        open={selectedMessage !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMessage(null);
        }}
        title={selectedMessage?.name ?? ''}
        description={selectedMessage?.email}
        size="lg"
        isPending={deleteMutation.isPending}
        hideFooter
      >
        {selectedMessage && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              {format.dateTime(new Date(selectedMessage.createdAt), {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
            </p>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {t('subjectLabel')}
              </h3>
              <p className="font-medium text-foreground">
                {selectedMessage.subject || t('noSubjectProvided')}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {t('messageLabel')}
              </h3>
              <ScrollArea className="h-[40vh] w-full rounded-md border bg-muted/30 p-4">
                <p className="whitespace-pre-wrap break-words text-[15px] leading-7">
                  {selectedMessage.message}
                </p>
              </ScrollArea>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                className="gap-2 text-destructive-text"
                disabled={deleteMutation.isPending}
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 />
                {tShared('confirmDelete.actionText')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedMessage(null)}
              >
                {t('close')}
              </Button>
            </div>
          </div>
        )}
      </RecordDialog>

      <ConfirmDeleteDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          if (selectedMessage) deleteMutation.mutate(selectedMessage.id);
        }}
        isLoading={deleteMutation.isPending}
        title={tCrud('deleteTitle', { entity })}
        description={tCrud('deleteDescription', {
          name: selectedMessage?.name ?? '',
        })}
      />
    </div>
  );
}
