import { fetchData } from '@/lib/core/fetch';
import { ContactContent } from '@/components/contact-content';
import { ContactShell } from '@/components/shell';

export default async function ContactPage() {
  const contact: any = await fetchData('me/contact');

  return (
    <ContactShell>
      <ContactContent
        linkedIn={contact?.linkedIn}
        email={contact?.email}
        github={contact?.github}
      />
    </ContactShell>
  );
}
