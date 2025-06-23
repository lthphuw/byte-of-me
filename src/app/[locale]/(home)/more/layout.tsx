interface MoreLayoutProps {
    children?: React.ReactNode
}

export default async function MoreLayout({
    children,
}: MoreLayoutProps) {

    return (
        <div className="flex flex-col gap-6">
            {children}
        </div>
    )
}
