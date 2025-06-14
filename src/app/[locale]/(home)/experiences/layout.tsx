
interface ExperiencesLayoutProps {
    children?: React.ReactNode
}

export default async function ExperiencesLayout({
    children,
}: ExperiencesLayoutProps) {

    return (
        <div className="flex flex-col gap-6">
            {children}
        </div>
    )
}
