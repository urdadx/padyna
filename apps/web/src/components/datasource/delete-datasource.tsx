import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../ui/alert-dialog";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";
import Spinner from "../ui/spinner";
import type { Item } from "./datasource-table";

interface DeleteDataSourceProps {
	item: Item;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DeleteDataSource({ item, open, onOpenChange }: DeleteDataSourceProps) {
	const deleteDataSource = useMutation({
		mutationFn: async () => {
			return trpcClient.datasource.delete.mutate({ id: item.id });
		},
		onSuccess: () => {
			toast.success("Data source deleted ");
			onOpenChange(false);

			queryClient.invalidateQueries({
				queryKey: trpc.datasource.getAll.queryOptions().queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: trpc.datasource.getMostReferenced.queryOptions({
					timeRange: "24h",
					limit: 10,
				}).queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: trpc.metrics.getOverview.queryOptions().queryKey,
			});
		},
		onError: (error) => {
			toast.error(`Failed to delete data source: ${error.message}`);
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
						This action cannot be undone. This will permanently delete the
						data source and remove all associated data from our servers.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={deleteDataSource.isPending}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={() => deleteDataSource.mutate()}
						disabled={deleteDataSource.isPending}
						className="bg-red-600 hover:bg-red-700 text-white">
						{deleteDataSource.isPending ? (
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
