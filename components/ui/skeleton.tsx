import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-[#e8edf9]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
