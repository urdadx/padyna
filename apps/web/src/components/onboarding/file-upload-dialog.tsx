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

interface FileWithId {
	id: string;
	file: File;
}

interface FileUploadDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpload: (files: File[]) => void;
}

export function FileUploadDialog({ open, onOpenChange, onUpload }: FileUploadDialogProps) {
	const [files, setFiles] = React.useState<FileWithId[]>([]);
	const [isDragging, setIsDragging] = React.useState(false);
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			addFiles(Array.from(e.target.files));
		}
	};

	const addFiles = (newFiles: File[]) => {
		const validFiles = newFiles.filter((file) => {
			const extension = file.name.split(".").pop()?.toLowerCase();
			return ["pdf", "csv", "txt", "docx", ".md", ".mdx"].includes(extension || "");
		});

		const filesWithId = validFiles.map((file) => ({
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

	const handleUpload = () => {
		onUpload(files.map((f) => f.file));
		setFiles([]);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl w-full">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						Upload Files
					</DialogTitle>
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
						" flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors cursor-pointer",
						isDragging
							? "border-primary bg-primary/5"
							: "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50",
					)}>
					<input
						type="file"
						ref={fileInputRef}
						onChange={handleFileChange}
						multiple
						accept=".pdf,.csv,.txt,.docx, .md, .mdx"
						className="hidden"
					/>
					<UploadIcon className="h-10 w-10 text-muted-foreground" />
					<p className="mt-4 text-sm font-medium">
						Click to upload or drag and drop
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						PDF, CSV, TXT, MD or DOCX (max. 20MB)
					</p>
				</div>

				{files.length > 0 && (
					<div className=" flex flex-col gap-2 max-h-50 overflow-y-auto pr-2">
						{files.map(({ id, file }) => (
							<div
								key={id}
								className="flex items-center justify-between rounded-lg border bg-muted/20 p-2 px-3">
								<div className="flex items-center gap-3 overflow-hidden">
									<DocumentIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
									<div className="flex flex-col overflow-hidden">
										<span className="truncate text-sm font-medium">
											{file.name}
										</span>
										<span className="text-xs text-muted-foreground">
											{(
												file.size /
												1024 /
												1024
											).toFixed(2)}{" "}
											MB
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
									className="h-8 w-8 text-destructive">
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						))}
					</div>
				)}

				<DialogFooter className="">
					<motion.div
						className="w-full"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}>
						<Button
							className="w-full"
							onClick={handleUpload}
							disabled={files.length === 0}>
							Add files
						</Button>
					</motion.div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
