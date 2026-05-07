import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight } from "lucide-react";
import { FileLinear } from "@/assets/icons/file-icon";
import { ChatLinear } from "@/assets/icons/chat-icon";
import { TextLinear } from "@/assets/icons/text-icon";
import { GlobeLinear } from "@/assets/icons/globe-icon";
import { NotionIcon } from "@/assets/icons/notion-icon";
import { GoogleDrive } from "@/assets/icons/google-drive-icon";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import BarList from "./bar-list";

const EMPTY_SOURCES = [
	{
		icon: <GlobeLinear color="black" className="w-4 h-4" />,
		title: "docs.padyna.com",
		value: 48,
		href: "",
	},
	{
		icon: <FileLinear color="black" className="w-4 h-4" />,
		title: "Implementation guide.pdf",
		value: 34,
		href: "",
	},
	{
		icon: <NotionIcon color="black" className="w-4 h-4" />,
		title: "Team knowledge base",
		value: 27,
		href: "",
	},
	{
		icon: <GoogleDrive color="black" className="w-4 h-4" />,
		title: "Q2 planning deck",
		value: 19,
		href: "",
	},
	{
		icon: <ChatLinear color="black" className="w-4 h-4" />,
		title: "Support playbook",
		value: 12,
		href: "",
	},
];

interface SourcesOverviewProps {
	sourcesData?: {
		id: string;
		sourceName?: string | null;
		url?: string | null;
		question?: string | null;
		sourceType: "file" | "link" | "qa" | "text" | "notion" | "google_drive";
		timesReferenced: number;
	}[];
}

export function SourcesOverview({ sourcesData }: SourcesOverviewProps) {
	const navigate = useNavigate();

	const mapSources = useMemo(() => {
		return (sourcesData ?? []).map((source) => {
			let icon = <FileLinear color="black" className="w-4 h-4" />;
			if (source.sourceType === "link")
				icon = <GlobeLinear color="black" className="w-4 h-4" />;
			if (source.sourceType === "qa")
				icon = <ChatLinear color="black" className="w-4 h-4" />;
			if (source.sourceType === "text")
				icon = <TextLinear color="black" className="w-4 h-4" />;
			if (source.sourceType === "notion")
				icon = <NotionIcon color="black" className="w-4 h-4" />;
			if (source.sourceType === "google_drive")
				icon = <GoogleDrive color="black" className="w-4 h-4" />;

			return {
				icon,
				title:
					source.sourceName ||
					source.question ||
					source.url ||
					"Untitled Source",
				value: source.timesReferenced,
				href: source.url || "",
				linkId: source.id,
			};
		});
	}, [sourcesData]);

	const topSources = mapSources.slice(0, 5);
	const maxSourceCount = Math.max(...mapSources.map((s) => s.value), 0);
	const hasData = mapSources.length > 0;
	const displayedSources = hasData ? topSources : EMPTY_SOURCES;
	const displayedMaxSourceCount = hasData
		? maxSourceCount
		: Math.max(...EMPTY_SOURCES.map((source) => source.value), 0);

	return (
		<div className="h-87.5 w-full z-0 rounded-xl border bg-white flex flex-col overflow-hidden">
			<Tabs defaultValue="sources" className="flex flex-col h-full">
				<div className="flex items-center justify-between px-4 pt-3 shrink-0">
					<TabsList className="h-auto pb-0 gap-2 rounded-none border-border bg-transparent px-0 text-foreground">
						<TabsTrigger
							value="sources"
							className="text-muted-foreground hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">
							Top data sources
						</TabsTrigger>
					</TabsList>
				</div>

				<div className="flex-1 min-h-0 overflow-hidden">
					<TabsContent value="sources" className="h-full m-0 p-0">
						<div className="h-full flex flex-col">
							<div className="flex-1 min-h-0 px-4 overflow-hidden">
								<div className="relative h-full">
									<div
										className={
											hasData
												? undefined
												: "pointer-events-none select-none blur-[3px] opacity-60"
										}>
										<BarList
											tab="Data Sources"
											unit="usages"
											data={displayedSources}
											barBackground="bg-blue-200/40"
											hoverBackground="hover:bg-blue-50"
											maxValue={displayedMaxSourceCount}
											limit={5}
										/>
									</div>
									{!hasData && (
										<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
											<div className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-foreground shadow-sm">
												No data available yet
											</div>
										</div>
									)}
								</div>
							</div>
							{hasData && mapSources.length > 5 && (
								<div className="shrink-0 px-4 py-3 ">
									<div className="flex items-center justify-center">
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												navigate({
													to: "/analytics",
												})
											}
											className="text-muted-foreground">
											View all
											<ArrowUpRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</div>
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
}
