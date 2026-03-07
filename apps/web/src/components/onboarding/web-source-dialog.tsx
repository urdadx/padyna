import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ScrapeWebsite } from "../scrape-website";
import { motion } from "motion/react";
import { CrawlWebsite } from "../crawl-website";

interface WebSourceProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function WebSourceDialog({ open, onOpenChange }: WebSourceProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl w-full">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">Add Links</DialogTitle>
					<DialogDescription className="leading-relaxed">
						Add URLs to your website, youtube videos etc to train your AI
						agent.
					</DialogDescription>
				</DialogHeader>
				<Tabs className="w-full">
					<TabsList className="w-fit justify-start text-foreground h-auto gap-2 bg-gray-50 rounded-md p-2">
						<TabsTrigger value="scrape">Single URL</TabsTrigger>
						<TabsTrigger value="crawl">Crawl an entire website</TabsTrigger>
					</TabsList>
					<TabsContent value="scrape">
						<ScrapeWebsite />
					</TabsContent>
					<TabsContent value="crawl">
						<CrawlWebsite />
					</TabsContent>
				</Tabs>
				<DialogFooter>
					<motion.div
						className="w-full"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}>
						<Button className="w-full">Add Link</Button>
					</motion.div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
