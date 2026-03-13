import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { trpc, trpcClient } from "@/utils/trpc";
import Spinner from "./ui/spinner";
import type { Item } from "./datasource-table";

interface DeleteDataSourceProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteDataSource({ item, open, onOpenChange }: DeleteDataSourceProps) {
  const queryClient = useQueryClient();
  const deleteDataSource = useMutation({
    mutationFn: async () => {
      return trpcClient.datasource.delete.mutate({ id: item.id });
    },
    onSuccess: () => {
      toast.success("Data source deleted successfully");
      onOpenChange(false);

      queryClient.invalidateQueries({
        queryKey: trpc.datasource.getAll.queryOptions().queryKey,
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
            This action cannot be undone. This will permanently delete the data source and remove
            all associated data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteDataSource.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteDataSource.mutate()}
            disabled={deleteDataSource.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleteDataSource.isPending ? (
              <>
                <Spinner color="white" className="mr-2" size={16} />
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
