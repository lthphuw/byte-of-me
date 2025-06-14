import { HomeShell } from "@/components/shell"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function HomeLoading() {
  return (
    <HomeShell>
      <Skeleton className={cn("size-full")} />
    </HomeShell>
  )
}
