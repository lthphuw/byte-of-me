import ChatContent from '@/components/chat-content';
import { AskMeShell } from '@/components/shell';

export default async function AskMePage() {
  return (
    <AskMeShell>
      <ChatContent />
    </AskMeShell>
  );
}
