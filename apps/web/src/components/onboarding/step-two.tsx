import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckMarkIcon } from "@/assets/icons/checkmark-icon";
import { TextIcon } from "@/assets/icons/text-icon";
import { NewFileIcon } from "@/assets/icons/file-icon";
import { QuestionCircleIcon } from "@/assets/icons/question-circle-icon";
import { NewPenIcon } from "@/assets/icons/pen-icon";
import { NewLinkIcon } from "@/assets/icons/link-icon";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { FileUploadDialog } from "./file-upload-dialog";
import { TextSourceDialog } from "./text-source-dialog";
import { QASourceDialog } from "./qa-source-dialog";
import { motion } from "motion/react";
import { WebSourceDialog } from "./web-source-dialog";

interface SourceItemProps {
	icon: React.ElementType;
	label: string;
	count?: string;
	status?: "added" | "default";
	onClick?: () => void;
}

interface StepProps {
	onBack: () => void;
	onContinue: () => void;
}

const SourceItem = ({ icon: Icon, label, count, status = "default", onClick }: SourceItemProps) => {
	const isAdded = status === "added";

	return (
		<div className="flex items-center justify-between py-4 border-b last:border-0 ">
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

export const StepTwo = ({ onBack, onContinue }: StepProps) => {
	const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
	const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
	const [isQADialogOpen, setIsQADialogOpen] = useState(false);
	const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

	const { data: sourceCounts } = useQuery({
		...trpc.datasource.getSourceCounts.queryOptions(),
		initialData: { file: 0, text: 0, link: 0, qa: 0 },
		refetchOnMount: true,
		staleTime: 0,
	});

	const fileStatus = sourceCounts.file > 0 ? "added" : "default";
	const textStatus = sourceCounts.text > 0 ? "added" : "default";
	const qaStatus = sourceCounts.qa > 0 ? "added" : "default";
	const linkStatus = sourceCounts.link > 0 ? "added" : "default";

	const linkCountLabel = sourceCounts.link > 0 ? sourceCounts.link.toString() : undefined;
	const fileCountLabel = sourceCounts.file > 0 ? sourceCounts.file.toString() : undefined;

	return (
		<div className="p-6 md:p-12 flex flex-col justify-center h-full max-w-lg mx-auto w-full relative">
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
				<motion.div
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					className="relative w-full">
					<Button className="w-full" onClick={onContinue} type="submit">
						Continue
					</Button>
				</motion.div>{" "}
				<Button className="text-gray-500" variant="ghost" onClick={onBack}>
					Go Back
				</Button>
			</div>
			<FileUploadDialog onOpenChange={setIsFileDialogOpen} open={isFileDialogOpen} />
			<TextSourceDialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen} />
			<QASourceDialog open={isQADialogOpen} onOpenChange={setIsQADialogOpen} />
			<WebSourceDialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen} />
		</div>
	);
};
