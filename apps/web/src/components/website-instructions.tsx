import { XIcon } from "lucide-react";
import { Button } from "./ui/button";
import { WebsiteIcon } from "@/assets/icons/website-icon";
import { env } from "@padyna/env/web";
import { toast } from "sonner";
import { useState } from "react";
import {
	CodeBlock,
	CodeBlockBody,
	CodeBlockContent,
	CodeBlockFilename,
	CodeBlockFiles,
	CodeBlockHeader,
	CodeBlockItem,
	type BundledLanguage,
} from "./ai-elements/code-block";

interface Chatbot {
	embedToken: string | null;
}

interface WebsiteInstructionsProps {
	chatbot: Chatbot;
	onClose?: () => void;
}

export const WebsiteInstructions = ({ chatbot, onClose }: WebsiteInstructionsProps) => {
	const [isCopied, setIsCopied] = useState(false);

	const websiteUrl = chatbot.embedToken
		? `${env.VITE_FRONTEND_ORIGIN}/widget?widgetId=${chatbot.embedToken}`
		: "";

	const handleCopy = () => {
		if (websiteUrl) {
			navigator.clipboard.writeText(websiteUrl);
			toast.success("Copied to clipboard");
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
		}
	};

	const handleOpen = () => {
		if (websiteUrl) {
			window.open(websiteUrl, "_blank");
		}
	};

	return (
		<>
			<div className="min-w-0 flex-1 p-2 onboarding-height overflow-hidden">
				<div className="relative h-full min-w-0 rounded-xl bg-white dark:bg-gray-950 overflow-hidden shadow-xs border dark:border-gray-800">
					<div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto p-8 scrollbar-hide">
						<div className=" min-w-0 shrink-0">
							<div className=" flex items-start justify-between">
								<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
									Share using a link
								</h3>
								<Button
									size="icon"
									variant="outline"
									className="text-gray-400 hover:text-gray-500 rounded-full"
									onClick={onClose}>
									<XIcon />
								</Button>
							</div>
							<p className="max-w-md text-pretty text-sm text-gray-600 dark:text-gray-400">
								Share a telegram link to your agent with your
								customers or team members.
							</p>
						</div>
						<div className="pt-5 pb-2">
							<div className="mb-2 gap-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-center gap-3">
									<WebsiteIcon color="green" />
									<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
										Share a link to your agent
									</p>
								</div>
								<div className="flex gap-2">
									<Button
										className="text-sm font-medium text-gray-600 dark:text-gray-100"
										variant="outline"
										size="sm"
										onClick={handleOpen}>
										Visit
									</Button>
									<Button
										className="text-sm font-medium text-gray-600 dark:text-gray-100"
										variant="outline"
										size="sm"
										onClick={handleCopy}>
										{isCopied ? "Copied" : "Copy"}
									</Button>
								</div>
							</div>
							<p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
								Copy this URL to share your agent as a standalone
								page.
							</p>
						</div>
						<div className="grid w-full min-w-0 overflow-hidden">
							<CodeBlock
								data={[
									{
										code: websiteUrl,
										language: "text",
										filename: "URL",
									},
								]}
								defaultValue="text">
								<CodeBlockHeader>
									<CodeBlockFiles>
										{(item) => (
											<CodeBlockFilename
												key={item.language}
												value={item.language}>
												{item.filename}
											</CodeBlockFilename>
										)}
									</CodeBlockFiles>
								</CodeBlockHeader>
								<CodeBlockBody className="h-10 overflow-y-auto hide-scrollbar">
									{(item) => (
										<CodeBlockItem
											key={item.language}
											value={item.language}>
											<CodeBlockContent
												language={
													item.language as BundledLanguage
												}>
												{item.code}
											</CodeBlockContent>
										</CodeBlockItem>
									)}
								</CodeBlockBody>
							</CodeBlock>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
