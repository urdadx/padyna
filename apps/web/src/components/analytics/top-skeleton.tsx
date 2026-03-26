import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export function TopSkeleton() {
	return (
		<div className="h-87.5 w-full z-0 rounded-xl border bg-white flex flex-col overflow-hidden">
			<Tabs defaultValue="countries" className="flex flex-col h-full">
				<div className="flex items-center justify-between px-4 py-3 shrink-0">
					<TabsList className="h-auto gap-2 rounded-none border-border bg-transparent px-0 text-foreground">
						<TabsTrigger
							value="countries"
							className="relative text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent">
							Countries
						</TabsTrigger>
						<TabsTrigger
							value="devices"
							className="relative text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent">
							Devices
						</TabsTrigger>
						<TabsTrigger
							value="os"
							className="relative text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent">
							OS
						</TabsTrigger>
					</TabsList>
				</div>

				<div className="flex-1 min-h-0 overflow-hidden">
					<TabsContent value="countries" className="h-full m-0 p-0">
						<div className="h-full flex flex-col">
							<div className="flex-1 min-h-0 px-4 pt-4 overflow-hidden space-y-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<div
										key={i}
										className="flex items-center gap-3">
										<Skeleton className="h-10 flex-1 ml-auto" />
									</div>
								))}
							</div>
						</div>
					</TabsContent>

					<TabsContent value="devices" className="h-full m-0 p-0">
						<div className="h-full flex flex-col">
							<div className="flex-1 min-h-0 px-4 pt-4 overflow-hidden space-y-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<div
										key={i}
										className="flex items-center gap-3">
										<Skeleton className="h-10 flex-1 ml-auto" />
									</div>
								))}
							</div>
						</div>
					</TabsContent>

					<TabsContent value="os" className="h-full m-0 p-0">
						<div className="h-full flex flex-col">
							<div className="flex-1 min-h-0 px-4 pt-4 overflow-hidden space-y-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<div
										key={i}
										className="flex items-center gap-3">
										<Skeleton className="h-10 flex-1 ml-auto" />
									</div>
								))}
							</div>
						</div>
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
}
