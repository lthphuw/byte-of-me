import { AboutShell } from "@/components/shell"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function AboutLoading() {
    return (
        <AboutShell>
            <Skeleton className={cn("size-full")} />
        </AboutShell>
    )
}
