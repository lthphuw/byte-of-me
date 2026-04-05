import { getContacts } from '@/lib/actions/public/get-contacts';
import { ContactContent } from '@/components/contact-content';
import { ContactShell } from '@/components/shell';

export default async function ContactPage() {
  const resp = await getContacts();
  if (!resp.success) {
    return <div>Error loading contact information.</div>;
  }

  const socialLinks = resp.data.socialLinks || [];
  const userId = socialLinks?.[0]?.userId;

  const githubLink = socialLinks.find((it) => it.platform === 'github')?.url;
  const linkedInLink = socialLinks.find(
    (it) => it.platform === 'linkedIn'
  )?.url;
  const emailLink = socialLinks.find((it) => it.platform === 'email')?.url;

  return (
    <ContactShell>
      <ContactContent
        userId={userId}
        linkedIn={linkedInLink}
        email={emailLink}
        github={githubLink}
      />
    </ContactShell>
  );
}
