import { Button } from "../ui/button";
import { CheckMarkIcon } from "@/assets/icons/checkmark-icon";
import { RoutingLinear } from "@/assets/icons/routing-icon";
import { SiderbarLinear } from "@/assets/icons/sidebar-icon";
import { SolarStarLinear } from "@/assets/icons/star-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export const ChatHeader = () => {
	return (
		<div className="px-2 sticky rounded-t-2xl top-0 flex justify-between h-14 shrink-0 items-center bg-background/50 backdrop-blur-lg border-b transition-[width,height] ease-linear z-10 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
			<div></div>

			<div className="flex items-center gap-2">
				<Tooltip>
					<TooltipContent>Mark as priority</TooltipContent>
					<TooltipTrigger>
						<Button variant="outline" size="icon" className="rounded-full">
							<SolarStarLinear className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger>
						<Button variant="outline" size="icon" className="rounded-full">
							<RoutingLinear className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Escalate to human agent</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger>
						<Button className="rounded-3xl">
							<CheckMarkIcon color="white" className="h-4 w-4" />
							Close
						</Button>
					</TooltipTrigger>
					<TooltipContent>Mark chat as closed</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger>
						<Button variant="outline" size="icon" className="rounded-full">
							<SiderbarLinear className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>View chat details</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
};
