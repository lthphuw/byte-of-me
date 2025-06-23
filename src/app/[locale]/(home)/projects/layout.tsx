interface ProjectsLayoutProps {
    children?: React.ReactNode
}

export default async function ProjectsLayout({
    children,
}: ProjectsLayoutProps) {

    return (
        <div className="flex flex-col gap-6">
            {children}
        </div>
    )
}
