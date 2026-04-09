import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import { queryClient } from "@/utils/trpc";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { ActionItem } from "./actions-table";
import Spinner from "../ui/spinner";

type DeleteActionProps = {
	item: ActionItem;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDeleted?: () => void;
};

export function DeleteAction({ item, open, onOpenChange, onDeleted }: DeleteActionProps) {
	const deleteMutation = useMutation({
		mutationFn: async () => {
			await api.delete(`/api/actions/${item.id}`);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["actions"] });
			toast.success("Action deleted");
			onOpenChange(false);
			onDeleted?.();
		},
		onError: (error: any) => {
			toast.error(error.response?.data?.message || "Failed to delete action");
		},
	});

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="text-lg font-semibold">
						Are you absolutely sure?
					</AlertDialogTitle>
					<AlertDialogDescription>
						This will permanently delete the agent action and remove all
						associated data.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={deleteMutation.isPending}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={() => deleteMutation.mutate()}
						disabled={deleteMutation.isPending}
						className="bg-red-600 hover:bg-red-700 text-white">
						{deleteMutation.isPending ? (
							<>
								<Spinner className="text-white mr-1" />
								Deleting...
							</>
						) : (
							"Yes, delete"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
