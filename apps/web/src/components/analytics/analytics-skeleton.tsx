import * as React from "react";

import { Skeleton } from "../ui/skeleton";
import { CardContent, CardHeader } from "../ui/card";

export function AnalyticsSkeleton() {
	return (
		<div className="mt-4 flex flex-col space-y-4 w-full">
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-10 w-36" />
			</div>

			<div className="px-1 py-5 w-full rounded-xl border bg-white">
				<CardHeader className="flex flex-row flex-wrap justify-between gap-4">
					<div className="flex flex-col gap-1 text-left min-w-24">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-7 w-16" />
					</div>
					<div className="flex flex-col gap-1 text-left min-w-24">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-7 w-16" />
					</div>
					<div className="flex flex-col gap-1 text-left min-w-24">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-7 w-16" />
					</div>
					<div className="flex flex-col gap-1 text-left min-w-24">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-7 w-16" />
					</div>
					<div className="flex flex-col gap-1 text-left min-w-24">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-7 w-16" />
					</div>
				</CardHeader>

				<CardContent className="pt-4 sm:pt-6">
					<Skeleton className="h-75 w-full" />
				</CardContent>
			</div>
		</div>
	);
}