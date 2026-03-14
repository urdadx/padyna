import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpandIcon } from "lucide-react";
import { useState } from "react";
import BarList from "./bar-list";
import { ViewAllStats } from "./view-all-stats";
import { FileLinear } from "@/assets/icons/file-icon";
import { ChatLinear } from "@/assets/icons/chat-icon";
import { TextLinear } from "@/assets/icons/text-icon";
import { GlobeLinear } from "@/assets/icons/globe-icon";

export function TopSources() {
	const [sourcesDialogOpen, setSourcesDialogOpen] = useState(false);

	const mapSources = [
		{
			icon: <FileLinear color="black" className="w-4 h-4" />,
			title: "documentation.pdf",
			value: 450,
			href: "",
			linkId: "",
		},
		{
			icon: <GlobeLinear color="black" className="w-4 h-4" />,
			title: "https://example.com/blog",
			value: 320,
			href: "",
			linkId: "",
		},
		{
			icon: <ChatLinear color="black" className="w-4 h-4" />,
			title: "What is your pricing?",
			value: 210,
			href: "",
			linkId: "",
		},
		{
			icon: <TextLinear color="black" className="w-4 h-4" />,
			title: "Company Overview snippet",
			value: 180,
			href: "",
			linkId: "",
		},
		{
			icon: <FileLinear color="black" className="w-4 h-4" />,
			title: "user_guide.docx",
			value: 150,
			href: "",
			linkId: "",
		},
		{
			icon: <GlobeLinear color="black" className="w-4 h-4" />,
			title: "https://docs.padyna.com",
			value: 120,
			href: "",
			linkId: "",
		},
	];

	const topSources = mapSources.slice(0, 5);
	const maxSourceCount = Math.max(...mapSources.map((s) => s.value));

	return (
		<div className="h-87.5 w-full z-0 rounded-xl border bg-white flex flex-col overflow-hidden">
			<Tabs defaultValue="sources" className="flex flex-col h-full">
				<div className="flex items-center justify-between px-4 py-3 shrink-0">
					<TabsList className="h-auto gap-2 rounded-none border-border bg-transparent px-0 text-foreground">
						<TabsTrigger
							value="sources"
							className="relative text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent">
							Top data sources
						</TabsTrigger>
					</TabsList>
				</div>

				<div className="flex-1 min-h-0 overflow-hidden">
					<TabsContent value="sources" className="h-full m-0 p-0">
						<div className="h-full flex flex-col">
							<div className="flex-1 min-h-0 px-4 pt-4 overflow-hidden">
								<BarList
									tab="Data Sources"
									unit="usages"
									data={topSources}
									barBackground="bg-rose-200"
									hoverBackground="hover:bg-rose-50"
									maxValue={maxSourceCount}
									limit={5}
								/>
							</div>
							{mapSources.length > 5 && (
								<div className="shrink-0 px-4 py-3 ">
									<div className="flex items-center justify-center">
										<Button
											variant="outline"
											onClick={() =>
												setSourcesDialogOpen(true)
											}
											className="text-muted-foreground">
											<ExpandIcon className="h-4 w-4 mr-1" />
											View all
										</Button>
									</div>
								</div>
							)}
						</div>
						<ViewAllStats
							name="data sources"
							dialogOpen={sourcesDialogOpen}
							setDialogOpen={setSourcesDialogOpen}
							allLinks={mapSources}
							maxTotalCount={maxSourceCount}
							bgColor="bg-rose"
						/>
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
}
