interface AboutLayoutProps {
  children?: React.ReactNode;
}

export default async function AboutLayout({ children }: AboutLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
