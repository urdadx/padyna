import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createFileRoute } from "@tanstack/react-router";
import { FileSource } from "@/components/file-source";
import { QASource } from "@/components/qa-source";
import { TextSource } from "@/components/text-source";
import z from "zod";
import { LinkSource } from "@/components/link-source";

const knowledgeSchema = z.object({
	tab: z.enum(["qa", "website", "files", "text"]).optional().default("files"),
});

export const Route = createFileRoute("/(admin)/data-sources")({
	component: RouteComponent,
	validateSearch: knowledgeSchema,
});

function RouteComponent() {
	const navigate = Route.useNavigate();
	const { tab } = Route.useSearch();

	const handleTabChange = (value: string) => {
		navigate({ search: { tab: value as "qa" | "files" | "website" | "text" } });
	};

	return (
		<div className="flex h-full w-full">
			<div className="w-full bg-background p-4 px-4 sm:px-6 lg:px-8 py-6">
				<div className="max-w-3xl mx-auto ">
					<h1 className="text-2xl font-semibold mb-4">Data Sources</h1>
					<Tabs value={tab} onValueChange={handleTabChange}>
						<TabsList className="w-full justify-start text-foreground h-auto gap-2 rounded-none border-b bg-transparent px-0">
							<TabsTrigger
								value="files"
								className="hover:bg-accent text-sm hover:text-foreground data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent relative after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
								Files
							</TabsTrigger>
							<TabsTrigger
								value="website"
								className="hover:bg-accent text-sm hover:text-foreground data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent relative after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
								Links
							</TabsTrigger>
							<TabsTrigger
								value="qa"
								className="hover:bg-accent text-sm hover:text-foreground data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent relative after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
								Q&A
							</TabsTrigger>

							<TabsTrigger
								value="text"
								className="hover:bg-accent text-sm hover:text-foreground data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent relative after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
								Text
							</TabsTrigger>
						</TabsList>

						<TabsContent value="files" className="mt-6">
							<FileSource />
						</TabsContent>
						<TabsContent value="qa" className="mt-6">
							<QASource />
						</TabsContent>
						<TabsContent value="website" className="mt-6">
							<LinkSource />
						</TabsContent>
						<TabsContent value="text" className="mt-6">
							<TextSource />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
