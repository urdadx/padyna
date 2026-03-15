import { Skeleton } from "@/components/ui/skeleton";
import { RowSkeleton } from "./row-skeleton";

export const AgentLoadingSkeleton = () => {
	return (
		<div className="flex h-full min-h-0 flex-col gap-6 bg-background pr-1">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
				<Skeleton className="h-6 w-12" />
			</div>
			<div className="flex flex-col gap-6 pb-6">
				<RowSkeleton label="Agent name" isLoading={true}>
					<Skeleton className="h-10 w-full" />
				</RowSkeleton>
				<RowSkeleton label="Agent icon" isLoading={true}>
					<Skeleton className="h-12 w-12" />
				</RowSkeleton>
				<RowSkeleton label="Use case" isLoading={true}>
					<Skeleton className="h-10 w-full" />
				</RowSkeleton>
				<RowSkeleton label="Primary color" isLoading={true}>
					<Skeleton className="h-10 w-full" />
				</RowSkeleton>
				<RowSkeleton label="Initial message" isLoading={true}>
					<Skeleton className="h-10 w-full" />
				</RowSkeleton>
				<RowSkeleton label="Suggested messages" isLoading={true}>
					<Skeleton className="h-10 w-full" />
				</RowSkeleton>
			</div>
		</div>
	);
};
