import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import api from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { queryClient, trpc } from "@/utils/trpc";
import { motion } from "motion/react";
import Spinner from "./ui/spinner";
import { SearchLinear } from "@/assets/icons/search-icon";

interface ScrapeWebsiteProps {
	onSuccess?: () => void;
}

export const ScrapeWebsite = ({ onSuccess }: ScrapeWebsiteProps) => {
	const [urlInput, setUrlInput] = useState("");

	const { mutate, isPending } = useMutation({
		mutationFn: async (url: string) => {
			const response = await api.post("/api/ingestion/scrape", { url });
			return response.data;
		},
		onSuccess: (data) => {
			toast.success(`Scraped ${data.url}`);
			queryClient.invalidateQueries({
				queryKey: trpc.datasource.getAll.queryOptions().queryKey,
			});
			setUrlInput("");
			onSuccess?.();
		},
		onError: (error: any) => {
			console.error(error);
			toast.error(error.response?.data?.message || "Failed to ingest link");
		},
	});

	const handleScrape = () => {
		if (!urlInput.trim()) {
			toast.error("Please enter a URL");
			return;
		}
		const rawUrl = urlInput.trim();
		const fullUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
		mutate(fullUrl);
	};

	return (
		<div className="flex flex-col gap-2 mt-3">
			<p className="text-sm text-muted-foreground">
				Enter a single page URL to extract content from it.
			</p>
			<div className="w-full flex justify-between items-center gap-2">
				<div className="flex rounded-md shadow-xs flex-1">
					<span className="border-input bg-gray-50 text-gray-500 inline-flex items-center rounded-s-md border px-3 text-sm">
						https://
					</span>
					<Input
						className="w-full -ms-px rounded-s-none shadow-none focus-visible:ring-0"
						placeholder="mywebsite.com"
						type="text"
						name="slug"
						required
						value={urlInput}
						onChange={(e) => setUrlInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleScrape();
						}}
						disabled={isPending}
					/>
				</div>
			</div>
			<motion.div
				className="w-full"
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}>
				<Button className="mt-2 w-full" onClick={handleScrape} disabled={isPending}>
					{isPending ? (
						<>
							<Spinner color="white" size={16} />
							Scraping...
						</>
					) : (
						<>
							<SearchLinear color="white" />
							Start scraping
						</>
					)}
				</Button>{" "}
			</motion.div>
		</div>
	);
};
