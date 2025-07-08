"use client";

import ChatContent from '@/components/chat-content';
import { AskMeShell } from '@/components/shell';
import { AssistantProvider } from '@/providers/assistant';

export default function AskMePage() {
  return (
    <AskMeShell>
      <AssistantProvider>
        <ChatContent />
      </AssistantProvider>
    </AskMeShell>
  );
}
