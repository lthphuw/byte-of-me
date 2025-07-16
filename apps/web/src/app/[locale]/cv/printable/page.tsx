import { supportedLanguages } from '@/config/language';
import CVContent from '@/components/cv-content';
import { CVShell } from '@/components/shell';

export function generateStaticParams() {
  return supportedLanguages.map((lang) => ({ locale: lang }));
}

export default function CVPage() {
  return (
    <CVShell>
      <CVContent />
    </CVShell>
  );
}
