import { ContactShell } from "@/components/shell"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function ContactLoading() {
    return (
        <ContactShell>
            <Skeleton className={cn("size-full")} />
        </ContactShell>
    )
}
