import { TrashBinLinear } from "@/assets/icons/trash-icon";
import { PlayLinear } from "@/assets/icons/play-icon";
import { Ban, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { queryClient } from "@/utils/trpc";

import type { ActionItem } from "./actions-table";
import { PenLinear } from "@/assets/icons/pen-icon";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { DeleteAction } from "./delete-action";

type ActionsPopoverProps = {
	item: ActionItem;
	onEdit?: () => void;
	onToggleEnable?: () => void;
	onDelete?: () => void;
};

export const ActionsPopover = ({ item, onEdit, onToggleEnable, onDelete }: ActionsPopoverProps) => {
	const navigate = useNavigate();
	const [deleteOpen, setDeleteOpen] = useState(false);
	const isActive = item.status === "Active";

	const toggleEnabledMutation = useMutation({
		mutationFn: async () => {
			const response = await api.patch(`/api/actions/${item.id}/enabled`, {
				enabled: !isActive,
			});

			return response.data;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["actions"] });
			await queryClient.invalidateQueries({ queryKey: ["actions", item.id] });
			toast.success(isActive ? "Action disabled" : "Action enabled");
			onToggleEnable?.();
		},
		onError: (error: any) => {
			toast.error(error.response?.data?.message || "Failed to update action status");
		},
	});

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
					<DropdownMenuItem
						onClick={() => {
							onEdit?.();
							navigate({
								to: "/actions/$actionId/edit",
								params: { actionId: item.id },
							});
						}}>
						<PenLinear className="size-4" />
						Edit
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => toggleEnabledMutation.mutate()}>
						{isActive ? (
							<Ban className="size-4 text-gray-400" />
						) : (
							<PlayLinear className="size-4" />
						)}
						{toggleEnabledMutation.isPending
							? isActive
								? "Disabling..."
								: "Enabling..."
							: isActive
								? "Disable"
								: "Enable"}
					</DropdownMenuItem>

					<DropdownMenuItem onClick={() => setDeleteOpen(true)}>
						<TrashBinLinear color="red" />
						<span className="text-red-500 hover:text-red-500/80">
							Delete
						</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<DeleteAction
				item={item}
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				onDeleted={onDelete}
			/>
		</>
	);
};
