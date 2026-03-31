import { RestartLinear } from "@/assets/icons/restart-icon";
import { TrashBinLinear } from "@/assets/icons/trash-icon";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";

import type { Item } from "./datasource-table";
import { PenLinear } from "@/assets/icons/pen-icon";
import { DeleteDataSource } from "./delete-datasource";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryClient, trpc } from "@/utils/trpc";
import api from "@/lib/api";
import { QASourceDialog } from "../onboarding/qa-source-dialog";
import { TextSourceDialog } from "../onboarding/text-source-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";

export const DataSourceActions = ({ item }: { item: Item }) => {
  const { type, url } = item;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editQaOpen, setEditQaOpen] = useState(false);
  const [editTextOpen, setEditTextOpen] = useState(false);

  const { mutate: recrawl, isPending: isRecrawling } = useMutation({
    mutationFn: async () => {
      const response = await api.post("/api/ingestion/scrape", { url: url });
      return response.data;
    },
    onMutate: () => {
      toast.loading("Recrawling...", { id: "recrawl-status" });
    },
    onSuccess: () => {
      toast.success("Done", { id: "recrawl-status" });
      queryClient.invalidateQueries({
        queryKey: trpc.datasource.getAll.queryOptions().queryKey,
      });
    },
    onError: (error: any) => {
      toast.warning(error.response?.data?.message || "Failed to recrawl link");
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button className="h-8 w-8 p-0" variant="outline" disabled={isRecrawling}>
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {type === "Q&A" && (
            <DropdownMenuItem onClick={() => setEditQaOpen(true)}>
              <PenLinear className="size-4" />
              Edit source
            </DropdownMenuItem>
          )}
          {type === "Text" && (
            <DropdownMenuItem onClick={() => setEditTextOpen(true)}>
              <PenLinear className="size-4" />
              Edit source
            </DropdownMenuItem>
          )}
          {type === "Link" && (
            <DropdownMenuItem
              onClick={() => {
                recrawl();
              }}
              disabled={isRecrawling}
            >
              <RestartLinear className="size-4" />
              Recrawl
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              setDeleteOpen(true);
            }}
          >
            <TrashBinLinear color="red" />
            <span className="text-red-500 hover:text-red-500/80">Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteDataSource item={item} open={deleteOpen} onOpenChange={setDeleteOpen} />

      {type === "Q&A" && (
        <QASourceDialog
          open={editQaOpen}
          onOpenChange={setEditQaOpen}
          defaultValues={{
            id: item.id,
            question: item.question || "",
            answer: item.answer || "",
          }}
        />
      )}

      {type === "Text" && (
        <TextSourceDialog
          open={editTextOpen}
          onOpenChange={setEditTextOpen}
          defaultValues={{
            id: item.id,
            title: item.name,
            content: item.contentText || "",
          }}
        />
      )}
    </>
  );
};
