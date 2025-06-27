interface ExperienceLayoutProps {
  children?: React.ReactNode;
}

export default async function ExperienceLayout({
  children,
}: ExperienceLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
