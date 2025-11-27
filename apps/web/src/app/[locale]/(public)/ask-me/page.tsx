import { supportedLanguages } from '@/config/language';
import ChatContent from '@/components/chat-content';
import { AskMeShell } from '@/components/shell';

export function generateStaticParams() {
  return supportedLanguages.map((lang) => ({ locale: lang }));
}

export default function AskMePage() {
  return (
    <AskMeShell>
      <ChatContent />
    </AskMeShell>
  );
}
