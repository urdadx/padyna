import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckMarkIcon } from "@/assets/icons/checkmark-icon";
import { MotionButton } from "../ui/motion-button";
import { TextIcon } from "@/assets/icons/text-icon";
import { NewFileIcon } from "@/assets/icons/file-icon";
import { QuestionCircleIcon } from "@/assets/icons/question-circle-icon";
import { NewPenIcon } from "@/assets/icons/pen-icon";
import { NewLinkIcon } from "@/assets/icons/link-icon";
import { useState } from "react";
import { FileUploadDialog } from "./file-upload-dialog";
import { TextSourceDialog } from "./text-source-dialog";
import { QASourceDialog } from "./qa-source-dialog";
import { LinkSourceDialog } from "./link-source-dialog";

interface SourceItemProps {
	icon: React.ElementType;
	label: string;
	count?: string;
	status?: "added" | "default";
	onClick?: () => void;
}

const SourceItem = ({ icon: Icon, label, count, status = "default", onClick }: SourceItemProps) => {
	const isAdded = status === "added";

	return (
		<div className="flex items-center justify-between py-4 border-b last:border-0">
			<div className="flex items-center gap-3">
				<div
					className={cn(
						"flex items-center justify-center w-8 h-8 rounded-md",
						isAdded ? "text-emerald-600" : "text-muted-foreground",
					)}>
					{isAdded ? (
						<CheckMarkIcon color="green" className="w-6 h-6  text-white" />
					) : (
						<Icon className="w-5 h-5" />
					)}
				</div>
				<span
					className={cn(
						"text-base font-medium",
						isAdded ? "text-foreground" : "text-foreground/80",
					)}>
					{count ? `${count} ${label}` : label}
				</span>
			</div>
			<Button variant="outline" size="icon" onClick={onClick}>
				{isAdded ? (
					<NewPenIcon className="w-5 h-5" />
				) : (
					<Plus className="w-5 h-5" />
				)}
			</Button>
		</div>
	);
};

export const StepTwo = ({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) => {
	const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
	const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
	const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
	const [textSource, setTextSource] = useState<{ title: string; content: string } | null>(null);
	const [isQADialogOpen, setIsQADialogOpen] = useState(false);
	const [qaSource, setQASource] = useState<{ question: string; answer: string } | null>(null);
	const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
	const [linkSources, setLinkSources] = useState<string[]>([]);

	const handleFileUpload = (files: File[]) => {
		setUploadedFiles((prev) => [...prev, ...files]);
	};

	const handleTextSave = (source: { title: string; content: string }) => {
		setTextSource(source);
	};

	const handleQASave = (source: { question: string; answer: string }) => {
		setQASource(source);
	};

	const handleLinkSave = (links: string[]) => {
		setLinkSources(links);
	};

	const fileCountLabel = uploadedFiles.length > 0 ? uploadedFiles.length.toString() : undefined;
	const fileStatus = uploadedFiles.length > 0 ? "added" : "default";

	const textStatus = textSource ? "added" : "default";

	const qaStatus = qaSource ? "added" : "default";

	const linkStatus = linkSources.length > 0 ? "added" : "default";
	const linkCountLabel = linkSources.length > 0 ? linkSources.length.toString() : undefined;

	return (
		<div className="p-6 md:p-12 flex flex-col justify-center h-full max-w-xl mx-auto w-full relative">
			<div className="flex flex-col gap-2 mb-5">
				<h1 className="text-3xl font-semibold">Add training sources</h1>
				<p className=" text-muted-foreground">
					You can add multiple sources to train your AI Agent, let's start with
					a file or a link to your site.
				</p>
			</div>

			<div className="flex flex-col mb-3">
				<SourceItem
					icon={NewFileIcon}
					label="Files"
					count={fileCountLabel}
					status={fileStatus}
					onClick={() => setIsFileDialogOpen(true)}
				/>
				<SourceItem
					icon={TextIcon}
					label="Text"
					status={textStatus}
					onClick={() => setIsTextDialogOpen(true)}
				/>
				<SourceItem
					icon={NewLinkIcon}
					label="Links"
					count={linkCountLabel}
					status={linkStatus}
					onClick={() => setIsLinkDialogOpen(true)}
				/>
				<SourceItem
					icon={QuestionCircleIcon}
					label="Q&A"
					status={qaStatus}
					onClick={() => setIsQADialogOpen(true)}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<MotionButton title="Train & continue" fn={onContinue} />
				<Button className="text-gray-500" variant="ghost" onClick={onBack}>
					Go Back
				</Button>
			</div>
			<FileUploadDialog
				onOpenChange={setIsFileDialogOpen}
				onUpload={handleFileUpload}
				open={isFileDialogOpen}
			/>
			<TextSourceDialog
				open={isTextDialogOpen}
				onOpenChange={setIsTextDialogOpen}
				onSave={handleTextSave}
				defaultValues={textSource || undefined}
			/>
			<QASourceDialog
				open={isQADialogOpen}
				onOpenChange={setIsQADialogOpen}
				onSave={handleQASave}
				defaultValues={qaSource || undefined}
			/>
			<LinkSourceDialog
				open={isLinkDialogOpen}
				onOpenChange={setIsLinkDialogOpen}
				onSave={handleLinkSave}
				defaultLinks={linkSources}
			/>
		</div>
	);
};
