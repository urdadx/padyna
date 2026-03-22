import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";
import { RestartLinear } from "@/assets/icons/restart-icon";

interface WidgetChatbot {
	name: string | null;
	image: string | null;
	primaryColor: string;
}

interface WidgetHeaderProps {
	chatbot?: WidgetChatbot | null;
	isLoading?: boolean;
	onReset?: () => void;
}

export const WidgetHeader = ({ chatbot, isLoading, onReset }: WidgetHeaderProps) => {
	return (
		<div className="flex h-16 items-center justify-between border-b px-5">
			<div className="flex items-center gap-3">
				{isLoading ? (
					<Skeleton className="w-9 h-9 rounded-md" />
				) : (
					<Avatar
						className="w-9 h-9 rounded-md border-primary"
						style={{ borderColor: chatbot?.primaryColor || "#6366f1" }}>
						<AvatarImage
							className="rounded-md"
							src={chatbot?.image || ""}
						/>
						<AvatarFallback
							className="font-semibold rounded-md"
							style={{
								backgroundColor: chatbot?.primaryColor || "#6366f1",
								color: "white",
							}}>
							{chatbot?.name?.charAt(0) || "P"}
						</AvatarFallback>
					</Avatar>
				)}
				<div>
					{isLoading ? (
						<Skeleton className="h-4 w-24" />
					) : (
						<p className="text-sm font-medium capitalize tracking-tight">
							{chatbot?.name || "Padyna"}
						</p>
					)}
				</div>
			</div>
			<Button
				variant="ghost"
				size="sm"
				type="button"
				onClick={onReset}
				aria-label="Reset conversation">
				<RestartLinear color="black" className="size-5" />
			</Button>
		</div>
	);
};
