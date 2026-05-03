import { PlusIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { FileLinear } from "@/assets/icons/file-icon";
import { TextLinear } from "@/assets/icons/text-icon";

import { useState } from "react";
import { FileUploadDialog } from "../onboarding/file-upload-dialog";
import { QASourceDialog } from "../onboarding/qa-source-dialog";
import { TextSourceDialog } from "../onboarding/text-source-dialog";
import { GlobeLinear } from "@/assets/icons/globe-icon";
import { ChatLinear } from "@/assets/icons/chat-icon";
import { WebSourceDialog } from "../onboarding/web-source-dialog";
import { NotionIcon } from "@/assets/icons/notion-icon";
import { GoogleDrive } from "@/assets/icons/google-drive-icon";

export const AddSource = () => {
	const [isFileModalOpen, setIsFileModalOpen] = useState(false);
	const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
	const [isQAModalOpen, setIsQAModalOpen] = useState(false);
	const [isTextModalOpen, setIsTextModalOpen] = useState(false);
	const [isNotionModalOpen, setIsNotionModalOpen] = useState(false);
	const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Button className="h-9 text-white w-full sm:w-auto">
						<PlusIcon className="h-4 w-4 text-white" />
						Add Data Source
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48">
					<DropdownMenuItem onClick={() => setIsFileModalOpen(true)}>
						<FileLinear />
						<span>Files</span>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setIsLinkModalOpen(true)}>
						<GlobeLinear />
						<span>Links</span>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setIsGoogleDriveModalOpen(true)}>
						<GoogleDrive />
						<span>Google Drive</span>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setIsNotionModalOpen(true)}>
						<NotionIcon />
						<span>Notion</span>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setIsQAModalOpen(true)}>
						<ChatLinear />
						<span>Q&A</span>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setIsTextModalOpen(true)}>
						<TextLinear />
						<span>Text snippets</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<FileUploadDialog
				open={isFileModalOpen}
				onOpenChange={setIsFileModalOpen}
				onUpload={(files) => {
					console.log("Uploaded files:", files);
				}}
			/>
			<WebSourceDialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen} />
			<QASourceDialog open={isQAModalOpen} onOpenChange={setIsQAModalOpen} />
			<TextSourceDialog open={isTextModalOpen} onOpenChange={setIsTextModalOpen} />
		</>
	);
};
