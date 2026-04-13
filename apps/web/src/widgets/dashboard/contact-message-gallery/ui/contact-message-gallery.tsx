'use client';

import { useState } from 'react';
import type { AdminContactMessage } from '@/entities/contact-message';
import { getPaginatedContactMessages } from '@/entities/contact-message/api/get-paginated-contacts';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Pagination } from '@/shared/ui/pagination';
import { RichText } from '@/shared/ui/rich-text';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Skeleton } from '@/shared/ui/skeleton';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MessageSquare, Search, X } from 'lucide-react';
import { useDebounce } from 'use-debounce';

export function ContactMessageGallery() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);

  const [selectedMessage, setSelectedMessage] =
    useState<AdminContactMessage | null>(null);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['contactMessages', page, debouncedSearch],
    queryFn: () =>
      getPaginatedContactMessages(page, 6, {
        search: debouncedSearch,
      }),
    placeholderData: (prev) => prev,
  });

  const messages = data?.data?.data || [];
  const meta = data?.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <MessageSquare className="text-primary h-5 w-5" />
            Recent Inquiries
          </h2>
          <p className="text-muted-foreground text-sm">
            Direct messages from your portfolio contact form.
          </p>
        </div>

        {!isLoading && (
          <div className="bg-muted text-muted-foreground hidden rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tighter md:block">
            {meta?.totalCount || 0} Messages
          </div>
        )}
      </div>

      <div className="group relative max-w-md">
        <Search className="text-muted-foreground group-focus-within:text-primary absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors" />
        <Input
          placeholder="Search messages..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="bg-background/50 rounded-xl border-dashed pl-9 transition-all focus:border-solid"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Gallery */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[160px] rounded-xl" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-muted-foreground py-10 text-center">
          No messages found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {messages.map((msg) => (
            <Card
              key={msg.id}
              className="hover:border-primary/50 group cursor-pointer rounded-2xl transition-colors"
              onClick={() => setSelectedMessage(msg)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="group-hover:text-primary font-semibold transition-colors">
                    {msg.name}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {format(new Date(msg.createdAt), 'dd/MM/yyyy')}
                  </div>
                </div>
                <div className="text-muted-foreground truncate text-sm italic">
                  {msg.subject || 'No Subject'}
                </div>
                <div className="text-muted-foreground truncate text-xs">
                  {msg.email}
                </div>
              </CardHeader>

              <CardContent>
                <div className="relative">
                  <RichText
                    className="line-clamp-3 text-sm"
                    content={msg.message}
                  />
                  <div className="text-primary mt-4 text-[10px] font-medium uppercase tracking-wider hover:underline">
                    Click to read more
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        pagination={meta}
        setPage={setPage}
        isPlaceholderData={isPlaceholderData}
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
                  <div className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs">
                    {format(new Date(selectedMessage.createdAt), 'PPP p')}
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="text-muted-foreground mb-1 text-xs font-bold uppercase tracking-widest">
                    Subject
                  </h4>
                  <p className="text-foreground font-medium">
                    {selectedMessage.subject || 'No subject provided'}
                  </p>
                </div>

                <div className="pt-4">
                  <h4 className="text-muted-foreground mb-2 text-xs font-bold uppercase tracking-widest">
                    Message
                  </h4>
                  <ScrollArea className="bg-muted/30 h-[40vh] w-full rounded-md border p-4">
                    <RichText content={selectedMessage.message} />
                  </ScrollArea>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMessage(null)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
