import { supportedLanguages } from '@/config/language';
import { ContactContent } from '@/components/contact-content';
import { ContactShell } from '@/components/shell';

export function generateStaticParams() {
  return supportedLanguages.map((lang) => ({ locale: lang }));
}

export default function ContactPage() {
  return (
    <ContactShell>
      <ContactContent />
    </ContactShell>
  );
}
