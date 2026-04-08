import DiscordLogo from "@/assets/discord.png";
import SlackLogo from "@/assets/slack-1.png";
import TelegramLogo from "@/assets/telegram.png";
import WebsiteLogo from "@/assets/website.png";
import WhatsAppLogo from "@/assets/whatsapp.png";
import { cn, timeAgo } from "@/lib/utils";
import { useState } from "react";
import { Button } from "../ui/button";
import { DeleteChat } from "./delete-chat";
import { TrashBinLinear } from "@/assets/icons/trash-icon";

const PLATFORM_BADGE_MAP: Record<string, { alt: string; src: string } | undefined> = {
	discord: { alt: "Discord", src: DiscordLogo },
	slack: { alt: "Slack", src: SlackLogo },
	telegram: { alt: "Telegram", src: TelegramLogo },
	web: { alt: "Website", src: WebsiteLogo },
	widget: { alt: "Website", src: WebsiteLogo },
	whatsapp: { alt: "WhatsApp", src: WhatsAppLogo },
};

interface ChatLogItemProps {
	id: string;
	status: string;
	title: string;
	date: string;
	platform?: string;
	onClick?: () => void;
	onDeleted?: () => void;
	isSelected?: boolean;
}

export const ChatLogItem = ({
	title,
	date,
	id,
	platform,
	onClick,
	onDeleted,
	isSelected,
}: ChatLogItemProps) => {
	const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
	const platformBadge = platform ? PLATFORM_BADGE_MAP[platform] : undefined;

	const handleDeleteClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setOpenDeleteDialog(true);
	};

	return (
		<>
			<div
				onClick={onClick}
				className={cn(
					"flex cursor-pointer font-sans mb-2 rounded-md items-start w-full space-x-3 p-4 hover:bg-gray-50 border-gray-100 group",
					isSelected && "bg-gray-50/50 rounded-md shadow-xs",
				)}>
				<div className="relative shrink-0 border-2 rounded-full border-primary/20">
					<img
						src={`https://api.dicebear.com/7.x/open-peeps/svg?seed=${id}`}
						alt="Avatar"
						className="w-8 h-8 rounded-full bg-gray-100"
					/>
					{platformBadge ? (
						<span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white shadow-xs">
							<img
								src={platformBadge.src}
								alt={platformBadge.alt}
								className="h-3 w-3 rounded-full object-contain"
							/>
						</span>
					) : null}
				</div>

				<div className="flex-1 min-w-0">
					<h3 className="text-sm font-sans capitalize line-clamp-1">{title}</h3>
					<p className="text-xs text-gray-500 mt-1">{timeAgo(date)}</p>
				</div>

				<div className="flex items-center space-x-2 shrink-0">
					<Button
						onClick={handleDeleteClick}
						size="icon"
						variant="ghost"
						className="flex items-center text-gray-500 gap-2 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0">
						<TrashBinLinear color="gray" />
					</Button>
				</div>
			</div>

			<DeleteChat
				id={id}
				open={openDeleteDialog}
				onOpenChange={setOpenDeleteDialog}
				onDeleted={onDeleted}
			/>
		</>
	);
};
