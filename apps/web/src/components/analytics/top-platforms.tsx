import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpandIcon } from "lucide-react";
import { useState } from "react";
import BarList from "./bar-list";
import { ViewAllStats } from "./view-all-stats";
import { SlackLinear } from "@/assets/icons/slack-icon";
import { WhatsappLinear } from "@/assets/icons/whatsapp-icon";
import { DiscordLinear } from "@/assets/icons/discord-icon";
import { ChatLinear } from "@/assets/icons/chat-icon";
import { GlobeLinear } from "@/assets/icons/globe-icon";

export function TopPlatforms() {
	const [platformsDialogOpen, setPlatformsDialogOpen] = useState(false);

	const mapPlatforms = [
		{
			icon: <ChatLinear color="black" className="w-4 h-4" />,
			title: "Widget",
			value: 1250,
			href: "",
			linkId: "",
		},
		{
			icon: <GlobeLinear color="black" className="w-4 h-4" />,

			title: "Link in bio",
			value: 840,
			href: "",
			linkId: "",
		},
		{
			icon: <SlackLinear color="black" className="w-4 h-4" />,
			title: "Slack",
			value: 620,
			href: "",
			linkId: "",
		},
		{
			icon: <DiscordLinear color="black" className="w-4 h-4" />,
			title: "Discord",
			value: 450,
			href: "",
			linkId: "",
		},
		{
			icon: <WhatsappLinear color="black" className="w-4 h-4" />,
			title: "WhatsApp",
			value: 320,
			href: "",
			linkId: "",
		},
	];

	const topPlatforms = mapPlatforms.slice(0, 5);
	const maxPlatformCount = Math.max(...mapPlatforms.map((p) => p.value));

	return (
		<div className="h-87.5 w-full rounded-xl z-0 border bg-white flex flex-col overflow-hidden">
			<Tabs defaultValue="platforms" className="flex flex-col h-full">
				<div className="flex items-center justify-between px-4 py-3 shrink-0">
					<TabsList className="h-auto gap-2 rounded-none border-border bg-transparent px-0 text-foreground">
						<TabsTrigger
							value="platforms"
							className="relative text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent">
							Top platforms
						</TabsTrigger>
					</TabsList>
				</div>

				<div className="flex-1 min-h-0 overflow-hidden">
					<TabsContent value="platforms" className="h-full m-0 p-0">
						<div className="h-full flex flex-col">
							<div className="flex-1 min-h-0 px-4 pt-4 overflow-hidden">
								<BarList
									tab="Platforms"
									unit="messages"
									data={topPlatforms}
									barBackground="bg-orange-200"
									hoverBackground="hover:bg-orange-50"
									maxValue={maxPlatformCount}
									limit={5}
								/>
							</div>
							{mapPlatforms.length > 5 && (
								<div className="shrink-0 px-4 py-3 ">
									<div className="flex items-center justify-center">
										<Button
											variant="outline"
											onClick={() =>
												setPlatformsDialogOpen(true)
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
							name="platforms"
							dialogOpen={platformsDialogOpen}
							setDialogOpen={setPlatformsDialogOpen}
							allLinks={mapPlatforms}
							maxTotalCount={maxPlatformCount}
						/>
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
}
