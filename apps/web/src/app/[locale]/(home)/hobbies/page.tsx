import { HobbiesContent } from '@/components/hobbies-content';
import { HobbiesShell } from '@/components/shell';

export default async function HobbiesPage() {
  return (
    <HobbiesShell>
      <HobbiesContent />
    </HobbiesShell>
  );
}
