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
import { useState } from "react";
import { toast } from "sonner";

interface DeleteChatProps {
	id: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export const DeleteChat = ({ id, open, onOpenChange }: DeleteChatProps) => {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			toast.success("Chat deleted successfully");
			onOpenChange(false);
		} catch (error) {
			console.log("Delete error:", error);
			toast.error("Failed to delete chat");
		} finally {
			setIsDeleting(false);
		}
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
					<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => {
							e.preventDefault();
							handleDelete();
						}}
						disabled={isDeleting}
						className="bg-red-600 hover:bg-red-700 text-white">
						{isDeleting ? "Deleting..." : "Yes, delete"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
