import { RestartLinear } from "@/assets/icons/restart-icon";
import { TrashBinLinear } from "@/assets/icons/trash-icon";
import { MoreHorizontal } from "lucide-react";

import type { ActionItem } from "./actions-table";
import { PenLinear } from "@/assets/icons/pen-icon";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";

type ActionsPopoverProps = {
	item: ActionItem;
	onEdit?: () => void;
	onToggleEnable?: () => void;
	onDelete?: () => void;
	isEnabled?: boolean;
};

export const ActionsPopover = ({
	onEdit,
	onToggleEnable,
	onDelete,
	isEnabled = true,
}: ActionsPopoverProps) => {
	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Button className="h-8 w-8 p-0" variant="outline">
						<span className="sr-only">Open menu</span>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={onEdit}>
						<PenLinear className="size-4" />
						Edit
					</DropdownMenuItem>
					<DropdownMenuItem onClick={onToggleEnable}>
						<RestartLinear className="size-4" />
						{isEnabled ? "Disable" : "Enable"}
					</DropdownMenuItem>

					<DropdownMenuItem onClick={onDelete}>
						<TrashBinLinear color="red" />
						<span className="text-red-500 hover:text-red-500/80">
							Delete
						</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};
