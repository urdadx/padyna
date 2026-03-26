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
import { toast } from "sonner";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import Spinner from "../ui/spinner";

interface DeleteChatProps {
	id: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDeleted?: () => void;
}

export const DeleteChat = ({ id, open, onOpenChange, onDeleted }: DeleteChatProps) => {
	const deleteMutation = useMutation({
		mutationFn: async () => {
			return trpcClient.conversations.delete.mutate({ id });
		},
		onSuccess: () => {
			toast.success("Chat deleted");
			onOpenChange(false);
			queryClient.invalidateQueries({
				queryKey: trpc.conversations.getAll.queryOptions().queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: trpc.conversations.getRecent.queryOptions({ limit: 5 }).queryKey,
			});

			onDeleted?.();
		},
		onError: (error) => {
			console.log("Delete error:", error);
			toast.error("Failed to delete chat. Please try again.");
		},
	});

	const handleDelete = async () => {
		await deleteMutation.mutateAsync();
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="p-5">
				<AlertDialogHeader>
					<AlertDialogTitle className="text-lg font-semibold">
						Are you absolutely sure?
					</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete the
						conversation and remove the data from our servers.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={deleteMutation.isPending}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => {
							e.preventDefault();
							handleDelete();
						}}
						disabled={deleteMutation.isPending}
						className="bg-red-600 hover:bg-red-700 text-white">
						{deleteMutation.isPending ? (
							<>
								<Spinner className="text-white" />
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
};
