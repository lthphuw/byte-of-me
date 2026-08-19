'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Pagination,
  ScrollArea,
  Skeleton,
  useDebounce,
} from '@byte-of-me/ui';
import { RichTextHtml } from '@byte-of-me/ui/rich-text-html';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Search, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import type { AdminContactMessageWithHtml } from '@/entities/contact-message';
import { getPaginatedContactMessages } from '@/entities/contact-message/api/get-paginated-contacts';
import { contactMessageKeys } from '@/entities/contact-message/model/query-keys';
import { ManagerListState } from '@/shared/ui';

export function ContactMessageGallery() {
  const t = useTranslations('dashboard.contactGallery');
  const tShared = useTranslations('dashboard.shared');
  const format = useFormatter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);

  const [selectedMessage, setSelectedMessage] =
    useState<AdminContactMessageWithHtml | null>(null);

  const { data, isLoading, isError, refetch, isPlaceholderData } = useQuery({
    queryKey: contactMessageKeys.list(page, debouncedSearch),
    // The action resolves with an ApiResponse rather than throwing, so unwrap
    // here: reading `success` in the component would leave `isError` false and
    // render the EMPTY state ("No messages found") on a server failure.
    queryFn: async () => {
      const res = await getPaginatedContactMessages(page, 6, {
        search: debouncedSearch,
      });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const messages = data?.data ?? [];
  const meta = data?.meta;

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
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="rounded-xl border-dashed bg-background/50 pl-9 transition-all focus:border-solid"
        />
        {search && (
          <button
            type="button"
            aria-label={t('clearSearch')}
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Gallery */}
      <ManagerListState
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        isEmpty={messages.length === 0}
        emptyTitle={t('noMessages')}
        skeleton={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[160px] rounded-xl" />
            ))}
          </div>
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
                  <RichTextHtml
                    variant="compact"
                    className="line-clamp-3 text-sm"
                    html={msg.messageHtml}
                  />
                  {/* A real button rather than `onClick` on the card: the
                      pseudo-element stretches the hit area over the whole card
                      while keyboard and screen-reader users get one named,
                      focusable control per message. */}
                  <button
                    type="button"
                    aria-label={t('readMessageFrom', { name: msg.name })}
                    onClick={() => setSelectedMessage(msg)}
                    className="mt-4 text-[10px] font-medium uppercase tracking-wider text-primary underline-offset-2 after:absolute after:inset-0 hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {t('clickMore')}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ManagerListState>

      {/* Pagination */}
      <Pagination
        pagination={meta}
        setPage={setPage}
        isPlaceholderData={isPlaceholderData}
        pageLabel={tShared('pagination.pageLabel', {
          page: meta?.currentPage ?? 1,
          totalPages: meta?.totalPages ?? 1,
        })}
        previousLabel={tShared('pagination.previous')}
        nextLabel={tShared('pagination.next')}
      />

      {/* Shared Detail Dialog */}
      <Dialog
        open={!!selectedMessage}
        onOpenChange={(open) => !open && setSelectedMessage(null)}
      >
        <DialogContent className="max-w-2xl">
          {selectedMessage && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between pr-6">
                  <div>
                    <DialogTitle className="text-xl">
                      {selectedMessage.name}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedMessage.email}
                    </DialogDescription>
                  </div>
                  <div className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {format.dateTime(new Date(selectedMessage.createdAt), {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })}
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t('subjectLabel')}
                  </h4>
                  <p className="font-medium text-foreground">
                    {selectedMessage.subject || t('noSubjectProvided')}
                  </p>
                </div>

                <div className="pt-4">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t('messageLabel')}
                  </h4>
                  <ScrollArea className="h-[40vh] w-full rounded-md border bg-muted/30 p-4">
                    <RichTextHtml html={selectedMessage.messageHtml} />
                  </ScrollArea>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMessage(null)}
                >
                  {t('close')}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
