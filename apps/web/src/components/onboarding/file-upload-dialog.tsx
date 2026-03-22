import * as React from "react";
import { UploadIcon } from "@/assets/icons/upload-icon";
import { DocumentIcon } from "@/assets/icons/document-icon";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { toast } from "sonner";
import api from "@/lib/api";
import Spinner from "../ui/spinner";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

interface FileIngestionResult {
  fileName: string;
  datasourceId: string;
  status: "synced" | "failed";
  chunkCount: number;
  message?: string;
}

interface FileIngestionResponse {
  results: FileIngestionResult[];
}

interface FileWithId {
  id: string;
  file: File;
}

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload?: (files: File[]) => void;
}

export function FileUploadDialog({ open, onOpenChange, onUpload }: FileUploadDialogProps) {
  const [files, setFiles] = useState<FileWithId[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      return ["pdf", "csv", "txt", "docx", "md", "mdx"].includes(extension || "");
    });

    const tooLargeFiles = validFiles.filter((file) => file.size > 20 * 1024 * 1024);
    if (tooLargeFiles.length > 0) {
      toast.error("Some files exceed the 20MB limit.");
    }

    const sizeFilteredFiles = validFiles.filter((file) => file.size <= 20 * 1024 * 1024);

    const filesWithId = sizeFilteredFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
    }));

    setFiles((prev) => [...prev, ...filesWithId]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const { mutate: uploadFiles, isPending } = useMutation({
    mutationFn: async (payload: File[]) => {
      const formData = new FormData();

      for (const file of payload) {
        formData.append("files", file);
      }

      const response = await api.post<FileIngestionResponse>("/api/ingestion/files", formData);
      return response.data;
    },
    onSuccess: (data, payload) => {
      if (onUpload) {
        onUpload(payload);
      }

      const synced = data.results.filter((result) => result.status === "synced").length;
      const failed = data.results.length - synced;

      if (synced > 0) {
        toast.success(`${synced} file${synced > 1 ? "s" : ""} ingested.`);
      }

      if (failed > 0) {
        toast.warning(`${failed} file${failed > 1 ? "s" : ""} failed during ingestion.`);
      }

      setFiles([]);
      onOpenChange(false);

      queryClient.invalidateQueries({
        queryKey: trpc.datasource.getAll.queryOptions().queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: trpc.datasource.getSourceCounts.queryOptions().queryKey,
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to ingest files.";
      toast.warning(message);
    },
  });

  const handleUpload = () => {
    if (files.length === 0) return;
    const payload = files.map((f) => f.file);
    uploadFiles(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Upload Files</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Upload or drag and drop your training documents.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            " flex flex-col items-center justify-center rounded-xl bg-gray-50 border-2 border-dashed p-4 transition-colors cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50",
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".pdf,.csv,.txt,.docx, .md, .mdx"
            className="hidden"
          />
          <div
            className="bg-white mb-2 flex size-16 shrink-0 items-center justify-center rounded-full border"
            aria-hidden="true"
          >
            <UploadIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-medium">Click to upload or drag and drop</p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, CSV, TXT, MD or DOCX (max. 20MB)
          </p>
        </div>

        {files.length > 0 && (
          <div className=" flex flex-col gap-2 max-h-50 overflow-y-auto pr-2">
            {files.map(({ id, file }) => (
              <div
                key={id}
                className="flex items-center justify-between rounded-lg border bg-muted/20 p-2 px-3"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <DocumentIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(() => {
                        const sizeInMB = file.size / (1024 * 1024);
                        if (sizeInMB < 1) {
                          const sizeInKB = file.size / 1024;
                          return `${sizeInKB.toFixed(2)} KB`;
                        } else {
                          return `${sizeInMB.toFixed(2)} MB`;
                        }
                      })()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(id);
                  }}
                  className="h-8 w-8 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="">
          <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              className="w-full"
              onClick={handleUpload}
              disabled={files.length === 0 || isPending}
            >
              {isPending ? (
                <>
                  <Spinner color="white" />
                  Uploading...
                </>
              ) : (
                "Add files"
              )}
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
