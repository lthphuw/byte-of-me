interface ContactLayoutProps {
  children?: React.ReactNode;
}

export default async function ContactLayout({ children }: ContactLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
