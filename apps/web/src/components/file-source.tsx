import * as React from "react";
import { UploadIcon } from "@/assets/icons/upload-icon";
import { DocumentIcon } from "@/assets/icons/document-icon";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileWithId {
	id: string;
	file: File;
}

interface FileSourceProps {
	className?: string;
}

export function FileSource({ className }: FileSourceProps) {
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

	return (
		<div className={cn("flex flex-col gap-4 rounded-xl border p-5", className)}>
			<div className="flex justify-between items-center ">
				<div className="flex flex-col gap-1">
					<h2 className="font-semibold text-xl tracking-tight ">Files</h2>
					<p className=" text-semibold text-base text-muted-foreground">
						Upload and manage various documents to train your AI agent
					</p>
				</div>
			</div>
			<div
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={() => fileInputRef.current?.click()}
				className={cn(
					" flex flex-col items-center justify-center rounded-xl border-2 bg-gray-50 border-dashed p-6 transition-colors cursor-pointer",
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
				<div
					className="bg-white mb-2 flex size-16 shrink-0 items-center justify-center rounded-full border"
					aria-hidden="true">
					<UploadIcon className="h-8 w-8 text-muted-foreground" />
				</div>
				<p className="mt-3 text-sm font-medium">Click to upload or drag and drop</p>
				<p className="mt-1 text-xs text-muted-foreground">
					PDF, CSV, TXT, MD or DOCX (max. 20MB)
				</p>
			</div>

			{files.length > 0 && (
				<div className=" flex flex-col gap-2 max-h-80 overflow-y-auto pr-2">
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
										{(file.size / 1024 / 1024).toFixed(2)}{" "}
										MB
									</span>
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={(e) => {
									e.stopPropagation();
									removeFile(id);
								}}
								className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
