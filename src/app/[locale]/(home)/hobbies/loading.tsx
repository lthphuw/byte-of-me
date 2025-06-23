import { HobbiesShell } from "@/components/shell"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function HobbiesLoading() {
    return (
        <HobbiesShell>
            <Skeleton className={cn("size-full")} />
        </HobbiesShell>
    )
}
