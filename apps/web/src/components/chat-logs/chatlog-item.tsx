import { cn, timeAgo } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { DeleteChat } from "./delete-chat";
import { ChatLogsIcon } from "@/assets/icons/chatlogs-icon";
import { CheckMarkLinear } from "@/assets/icons/checkmark-icon";
import { TrashBinLinear } from "@/assets/icons/trash-icon";
import { AlertLinear } from "@/assets/icons/alert-icon";

interface ChatLogItemProps {
	id: string;
	status: string;
	title: string;
	date: string;
	onClick?: () => void;
	isSelected?: boolean;
}

export const ChatLogItem = ({
	title,
	date,
	id,
	status: initialStatus,
	onClick,
	isSelected,
}: ChatLogItemProps) => {
	const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
	const [currentStatus, setCurrentStatus] = useState(initialStatus);
	const [isUpdating, setIsUpdating] = useState(false);

	const handleStatusChange = async (newStatus: string) => {
		setIsUpdating(true);

		await new Promise((resolve) => setTimeout(resolve, 800));

		setCurrentStatus(newStatus);
		toast.success(`Chat status updated to ${newStatus}`);
		setIsUpdating(false);
	};

	const handleDeleteClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setOpenDeleteDialog(true);
	};

	return (
		<>
			<div
				onClick={onClick}
				className={cn(
					"flex cursor-pointer font-sans mb-2 rounded-md items-start w-full space-x-3 p-4 hover:bg-gray-50 border-gray-100 group",
					isSelected && "bg-gray-50/40 rounded-md ",
				)}>
				<div className="shrink-0 border-2 rounded-full border-primary/20">
					<img
						src={`https://api.dicebear.com/7.x/open-peeps/svg?seed=${id}`}
						alt="Avatar"
						className="w-8 h-8 rounded-full bg-gray-100"
					/>
				</div>

				<div className="flex-1 min-w-0">
					<h3 className="text-sm font-sans line-clamp-1">
						{title || "Untitled Chat"}
					</h3>
					<p className="text-xs text-gray-500 mt-1">{timeAgo(date)}</p>
				</div>

				<div className="flex items-center space-x-2 shrink-0">
					<DropdownMenu>
						<DropdownMenuTrigger>
							<Button
								size="icon"
								variant="ghost"
								className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-gray-200"
								onClick={(e) => e.stopPropagation()}>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							{currentStatus !== "unresolved" && (
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										handleStatusChange("unresolved");
									}}
									disabled={isUpdating}
									className="flex items-center gap-2 cursor-pointer">
									<ChatLogsIcon color="black" />
									Mark as unresolved
								</DropdownMenuItem>
							)}
							{currentStatus !== "resolved" && (
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										handleStatusChange("resolved");
									}}
									disabled={isUpdating}
									className="flex items-center gap-2 cursor-pointer">
									<CheckMarkLinear color="black" />
									Mark as resolved
								</DropdownMenuItem>
							)}
							{currentStatus !== "escalated" && (
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										handleStatusChange("escalated");
									}}
									disabled={isUpdating}
									className="flex items-center gap-2 cursor-pointer">
									<AlertLinear color="black" />
									Escalate to human
								</DropdownMenuItem>
							)}
							<DropdownMenuItem
								onClick={handleDeleteClick}
								disabled={isUpdating}
								className="flex items-center text-red-500 gap-2 cursor-pointer">
								<TrashBinLinear color="red" />
								Delete conversation
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<DeleteChat id={id} open={openDeleteDialog} onOpenChange={setOpenDeleteDialog} />
		</>
	);
};
