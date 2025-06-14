import { ExperiencesShell } from "@/components/shell"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function ExperiencesLoading() {
    return (
        <ExperiencesShell>
            <Skeleton className={cn("size-full")} />
        </ExperiencesShell>
    )
}
