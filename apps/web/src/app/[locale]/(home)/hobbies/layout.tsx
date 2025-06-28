import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hobbies',
};
interface HobbiesLayoutProps {
  children?: React.ReactNode;
}

export default async function HobbiesLayout({ children }: HobbiesLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
