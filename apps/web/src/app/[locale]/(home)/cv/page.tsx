import CVContent from '@/components/cv-content';
import { CVShell } from '@/components/shell';
import { supportedLanguages } from '@/config/language';

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
