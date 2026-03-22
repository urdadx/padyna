import { Label } from "../ui/label";
import { Skeleton } from "../ui/skeleton";

interface RowSkeletonProps {
  label: string;
  isLoading?: boolean;
  children: React.ReactNode;
  description?: React.ReactNode;
  skeletonClassName?: string;
}

export const RowSkeleton = ({
  label,
  isLoading,
  children,
  description,
  skeletonClassName = "h-10 w-full",
}: RowSkeletonProps) => (
  <div className="flex flex-col gap-3">
    <Label className="text-muted-foreground font-medium flex items-center gap-1.5">
      {label} {description}
    </Label>
    {isLoading ? <Skeleton className={skeletonClassName} /> : children}
  </div>
);
