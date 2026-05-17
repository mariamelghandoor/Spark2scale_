import { cn } from "@/lib/utils"
import LegoSpinner from "@/components/lego/LegoSpinner";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
    return (
        <LegoSpinner
            role="status"
            aria-label="Loading"
            className={cn("size-4 animate-spin", className)}
            {...props}
        />
    )
}

export { Spinner }
