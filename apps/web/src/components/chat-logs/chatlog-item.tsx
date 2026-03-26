import { cn, timeAgo } from "@/lib/utils";
import { useState } from "react";
import { Button } from "../ui/button";
import { DeleteChat } from "./delete-chat";
import { TrashBinLinear } from "@/assets/icons/trash-icon";

interface ChatLogItemProps {
	id: string;
	status: string;
	title: string;
	date: string;
	onClick?: () => void;
	onDeleted?: () => void;
	isSelected?: boolean;
}

export const ChatLogItem = ({
	title,
	date,
	id,
	onClick,
	onDeleted,
	isSelected,
}: ChatLogItemProps) => {
	const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

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
					isSelected && "bg-gray-50/90 rounded-md ",
				)}>
				<div className="shrink-0 border-2 rounded-full border-primary/20">
					<img
						src={`https://api.dicebear.com/7.x/open-peeps/svg?seed=${id}`}
						alt="Avatar"
						className="w-8 h-8 rounded-full bg-gray-100"
					/>
				</div>

				<div className="flex-1 min-w-0">
					<h3 className="text-sm font-sans capitalize line-clamp-1">{title}</h3>
					<p className="text-xs text-gray-500 mt-1">{timeAgo(date)}</p>
				</div>

				<div className="flex items-center space-x-2 shrink-0">
					<Button
						onClick={handleDeleteClick}
						size="icon"
						variant="ghost"
						className="flex items-center text-gray-500 gap-2 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0">
						<TrashBinLinear color="gray" />
					</Button>
				</div>
			</div>

			<DeleteChat
				id={id}
				open={openDeleteDialog}
				onOpenChange={setOpenDeleteDialog}
				onDeleted={onDeleted}
			/>
		</>
	);
};
