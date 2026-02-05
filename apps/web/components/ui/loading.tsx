import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils/utils"

function Loading({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2", className)}
      {...props}
    >
      <span className="text-muted-foreground">Loading</span>
      <Spinner className="size-6" />
    </div>
  )
}

export { Loading }
