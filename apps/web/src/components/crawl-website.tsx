import { Input } from "./ui/input";

export const CrawlWebsite = () => {
	return (
		<div className="flex flex-col gap-2 mt-3">
			<p className="text-sm text-muted-foreground">
				Crawl and extract content from an entire website
			</p>
			<div className="w-full flex justify-between items-center gap-2">
				<div className="flex rounded-md shadow-xs flex-1">
					<span className="border-input bg-gray-50 text-gray-500 inline-flex items-center rounded-s-md border px-3 text-sm">
						https://
					</span>
					<Input
						className="w-full -ms-px rounded-s-none shadow-none"
						placeholder="mywebsite.com"
						type="text"
						name="slug"
						required
					/>
				</div>
			</div>
		</div>
	);
};
