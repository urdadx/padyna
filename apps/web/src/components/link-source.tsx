import { useNavigate, useSearch } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrapeWebsite } from "./scrape-website";

export const LinkSource = () => {
	const navigate = useNavigate({ from: "/data-sources" });
	const search = useSearch({ from: "/(admin)/data-sources" });

	const websiteTab = (search as any).websiteTab || "scrape";

	const handleTabChange = (value: string) => {
		navigate({
			search: (prev: any) => ({
				...prev,
				websiteTab: value as "scrape" | "crawl",
			}),
		});
	};
	return (
		<div className="flex flex-col gap-2 rounded-xl p-6 border bg-white">
			<div className="flex justify-between items-center mb-3">
				<div className="flex flex-col gap-2">
					<h2 className="font-semibold text-xl">Links</h2>
					<p className="text-semibold text-base text-muted-foreground">
						Extract content from web pages, youtube videos and many more.
					</p>
				</div>
			</div>
			<Tabs value={websiteTab} onValueChange={handleTabChange} className="w-full">
				<TabsList className="w-fit justify-start text-foreground h-auto gap-2 bg-gray-50 rounded-md p-2 ">
					<TabsTrigger value="scrape">Single URL</TabsTrigger>
					<TabsTrigger value="crawl">Crawl an entire website</TabsTrigger>
				</TabsList>
				<TabsContent value="scrape">
					<ScrapeWebsite />
				</TabsContent>
				<TabsContent value="crawl"></TabsContent>
			</Tabs>
		</div>
	);
};
