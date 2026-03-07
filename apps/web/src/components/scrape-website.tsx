import { motion } from "motion/react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { PlayLinear } from "@/assets/icons/play-icon";

export const ScrapeWebsite = () => {
	return (
		<div className="flex flex-col gap-2 mt-6">
			<p className="text-sm text-muted-foreground">
				Enter a single page URL to extract content from it.
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
				<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
					<Button className="w-fit">
						{/* <Spinner className="text-white" /> */}
						<PlayLinear color="white" />
						Start scraping
					</Button>
				</motion.div>
			</div>
		</div>
	);
};
