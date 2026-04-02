import { AlertCircleIcon } from "lucide-react";
import { Button } from "../ui/button";

export const EscalatedBanner = () => {
	return (
		<div className="rounded-md bg-orange-50 p-4">
			<div className="flex gap-2 items-center">
				<AlertCircleIcon
					className="h-5 w-5 shrink-0 text-orange-800"
					aria-hidden="true"
				/>
				<h3 className="text-sm font-sans font-normal text-orange-800">
					Conversation escalated to a human agent. They will be with you shortly
					.
				</h3>
			</div>
		</div>
	);
};

export const DisabledBanner = () => {
	return (
		<div className="rounded-md bg-blue-50 p-4">
			<div className="flex gap-2 items-center">
				<AlertCircleIcon
					className="h-5 w-5 shrink-0 text-blue-800"
					aria-hidden="true"
				/>
				<h3 className="text-sm font-sans font-normal text-blue-800">
					This widget is currently disabled. Please contact the site
					administrator for help
				</h3>
			</div>
		</div>
	);
};

export const ErrorBanner = () => {
	return (
		<div className="rounded-md bg-red-50 p-4">
			<div className="flex gap-2">
				<AlertCircleIcon
					className="h-5 w-5 shrink-0 text-red-800"
					aria-hidden="true"
				/>
				<h3 className="text-sm font-sans font-normal text-red-800">
					Something went wrong. Please try again.
				</h3>
			</div>
		</div>
	);
};

export const ClosedBanner = ({ startNewConversation }: { startNewConversation: () => void }) => {
	return (
		<div className="rounded-md bg-gray-50 p-4 flex flex-col gap-3">
			<div className="flex gap-2 items-start">
				<AlertCircleIcon
					className="h-5 w-5 shrink-0 text-gray-800"
					aria-hidden="true"
				/>
				<h3 className="text-sm font-sans font-normal text-gray-800">
					This conversation has been closed. If you have any further questions,
					please start a new conversation.
				</h3>
			</div>
			<div className="flex px-6">
				<Button
					variant="outline"
					size="sm"
					onClick={startNewConversation}
					className="self-start">
					Start new conversation
				</Button>
			</div>
		</div>
	);
};
