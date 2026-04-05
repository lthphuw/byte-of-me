'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MessageSquare, Search, X } from 'lucide-react';
import { useDebounce } from 'use-debounce';

import {
  ContactMessage,
  getPaginatedContactMessages,
} from '@/lib/actions/dashboard/contact-message/get-paginated-contacts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/pagination';
import { RichText } from '@/components/rich-text';

export function ContactMessageGallery() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);

  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(
    null
  );

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
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Recent Inquiries
          </h2>
          <p className="text-sm text-muted-foreground">
            Direct messages from your portfolio contact form.
          </p>
        </div>

        {!isLoading && (
          <div className="hidden md:block px-3 py-1 bg-muted rounded-full text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
            {meta?.totalCount || 0} Messages
          </div>
        )}
      </div>

      <div className="relative group max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search messages..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="pl-9 bg-background/50 rounded-xl border-dashed focus:border-solid transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Gallery */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[160px] rounded-xl" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          No messages found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {messages.map((msg) => (
            <Card
              key={msg.id}
              className="rounded-2xl cursor-pointer hover:border-primary/50 transition-colors group"
              onClick={() => setSelectedMessage(msg)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold group-hover:text-primary transition-colors">
                    {msg.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(msg.createdAt), 'dd/MM/yyyy')}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground truncate italic">
                  {msg.subject || 'No Subject'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {msg.email}
                </div>
              </CardHeader>

              <CardContent>
                <div className="relative">
                  <RichText
                    className="text-sm line-clamp-3"
                    content={msg.message}
                  />
                  <div className="mt-4 text-[10px] text-primary font-medium uppercase tracking-wider hover:underline">
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
                <div className="flex justify-between items-start pr-6">
                  <div>
                    <DialogTitle className="text-xl">
                      {selectedMessage.name}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedMessage.email}
                    </DialogDescription>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {format(new Date(selectedMessage.createdAt), 'PPP p')}
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Subject
                  </h4>
                  <p className="font-medium text-foreground">
                    {selectedMessage.subject || 'No subject provided'}
                  </p>
                </div>

                <div className="pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Message
                  </h4>
                  <ScrollArea className="h-[40vh] w-full rounded-md border p-4 bg-muted/30">
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
