import { toast } from "sonner";
import { Button } from "../ui/button";
import type { IntegrationCardData } from "./types";

export function SlackIntegrationCard({ data }: { data: IntegrationCardData }) {
	return (
		<div className="bg-white rounded-xl p-3 border border-gray-200  w-full max-w-md mx-auto h-full">
			<div className="flex flex-col gap-2 h-full">
				<div className="flex justify-between items-center">
					<div className="flex items-center gap-2">
						<img
							className="size-7 sm:size-8"
							src={data.logo}
							alt="integration-icon"
							loading="lazy"
						/>
					</div>
				</div>
				<h3 className="font-medium font-sans text-sm sm:text-base">{data.name}</h3>
				<p className="text-gray-600 text-sm sm:text-md grow">{data.description}</p>
				<Button
					size="sm"
					className="w-fit rounded-sm text-sm"
					variant="outline"
					onClick={() => toast.info("Slack integration is not wired yet.")}>
					Connect
				</Button>
			</div>
		</div>
	);
}
