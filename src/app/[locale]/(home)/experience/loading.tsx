import { ExperienceShell } from "@/components/shell"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function ExperienceLoading() {
    return (
        <ExperienceShell>
            <Skeleton className={cn("size-full")} />
        </ExperienceShell>
    )
}
