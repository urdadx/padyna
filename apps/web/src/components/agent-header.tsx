import { RestartLinear } from "@/assets/icons/restart-icon";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export const AgentHeader = () => {
	return (
		<div className="flex h-16 items-center justify-between border-b px-5">
			<div className="flex items-center gap-3">
				<Avatar className="w-9 h-9 rounded-md border-primary">
					<AvatarImage className="rounded-md" src={""} />
					<AvatarFallback className="bg-primary/80 text-white font-semibold rounded-md border-primary">
						JB
					</AvatarFallback>
				</Avatar>{" "}
				<div>
					<p className="text-sm font-semibold tracking-tight">urdadx.tech</p>
				</div>
			</div>
			<Button
				variant="ghost"
				size="icon-sm"
				type="button"
				aria-label="Reset conversation">
				<RestartLinear color="black" className="size-5" />
			</Button>
		</div>
	);
};
