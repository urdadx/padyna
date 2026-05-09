import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@padyna/api/routers/index";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { EyeLinear } from "@/assets/icons/eye-icon";
import { SolarStarLinear } from "@/assets/icons/star-icon";
import { UserLinear } from "@/assets/icons/user-icon";
import { GlobeLinear } from "@/assets/icons/globe-icon";
import { PenLinear } from "@/assets/icons/pen-icon";
import { MobilePhoneLinear } from "@/assets/icons/mobilephone-icon";
import { LocationLinear } from "@/assets/icons/location-icon";
import { SolarBoxMinimalisticLinear } from "@/assets/icons/box-icon";
import { AtSignIcon } from "@/assets/icons/at-sign-icon";
import { Badge } from "../ui/badge";
import { XIcon } from "lucide-react";
import { Button } from "../ui/button";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ConversationDetails = RouterOutputs["conversations"]["getById"];

interface ChatDetailsProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	conversation?: ConversationDetails;
	assignedUserName?: string;
}

type DetailItem = {
	label: string;
	value?: string;
	icon?: React.ElementType;
};

const CHAT_DETAILS_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
	dateStyle: "medium",
	timeStyle: "short",
});

function formatDate(value: Date | string | null | undefined) {
	if (!value) {
		return "Not available";
	}

	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "Not available";
	}

	return CHAT_DETAILS_DATE_FORMATTER.format(date);
}

function DetailRow({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: React.ReactNode;
	icon?: React.ElementType;
}) {
	return (
		<div className="flex items-center justify-between gap-4 py-0.5">
			<span className="text-sm text-muted-foreground flex items-center gap-2">
				{Icon && <Icon className="size-3.5 shrink-0 opacity-80" />}
				{label}
			</span>
			<div className={"max-w-[60%] text-right text-xs font-sans break-all"}>
				{value ?? "Not available"}
			</div>
		</div>
	);
}

function getStringValue(value: unknown) {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;
}

function getParticipantDetails(conversation?: ConversationDetails): DetailItem[] {
	const metadata = conversation?.metadata as Record<string, any> | undefined;
	const channel = conversation?.channel;
	const sourceLabel = getStringValue(metadata?.sourceLabel);
	const participantName = getStringValue(metadata?.participantName);
	const participantHandle = getStringValue(metadata?.participantHandle);

	const location = [getStringValue(metadata?.city), getStringValue(metadata?.country)]
		.filter(Boolean)
		.join(", ");
	const device = [
		getStringValue(metadata?.deviceInfo?.type),
		getStringValue(metadata?.deviceInfo?.model),
	]
		.filter(Boolean)
		.join(" • ");
	const browser = getStringValue(metadata?.deviceInfo?.browser);
	const os = getStringValue(metadata?.deviceInfo?.os);
	const details: DetailItem[] = [
		{
			label: "Source",
			value:
				sourceLabel ||
				(channel === "web"
					? "Website chat"
					: channel === "widget"
						? "Widget chat"
						: channel
							? channel.charAt(0).toUpperCase() + channel.slice(1)
							: undefined),
			icon: GlobeLinear,
		},
		{
			label: "Last activity",
			value: formatDate(conversation?.updatedAt),
			icon: PenLinear,
		},
	];

	if (participantName) {
		details.push({
			label: "Name",
			value: participantName,
			icon: UserLinear,
		});
	}

	if (participantHandle) {
		details.push({
			label: "Username",
			value: participantHandle,
			icon: AtSignIcon,
		});
	}

	if (channel === "telegram" || channel === "slack" || channel === "discord") {
		return details;
	}

	details.push(
		{
			label: "Location",
			value: location || undefined,
			icon: LocationLinear,
		},
		{
			label: "Device",
			value: device || undefined,
			icon: MobilePhoneLinear,
		},
		{
			label: "Browser",
			value: browser,
			icon: GlobeLinear,
		},
		{
			label: "Operating system",
			value: os,
			icon: SolarBoxMinimalisticLinear,
		},
	);

	return details;
}

export const ChatDetails = ({
	isOpen,
	onOpenChange,
	conversation,
	assignedUserName,
}: ChatDetailsProps) => {
	const isMobile = useIsMobile();
	const participantDetails = getParticipantDetails(conversation);

	return (
		<Drawer
			open={isOpen}
			onOpenChange={onOpenChange}
			direction={isMobile ? "bottom" : "right"}>
			<DrawerContent
				className={cn(
					"bg-background rounded-none! h-[90vh] sm:h-full fixed outline-none max-w-107.5! flex",
				)}>
				<div className="flex items-center justify-between p-4">
					<DrawerHeader className="p-0 text-left! ">
						<DrawerTitle className="text-xl font-semibold">
							Chat details
						</DrawerTitle>
						<DrawerDescription>
							View detailed information about this conversation
						</DrawerDescription>
					</DrawerHeader>
					<Button
						onClick={() => onOpenChange(false)}
						size="icon"
						className="rounded-full hidden sm:flex"
						variant="outline">
						<XIcon />
					</Button>
				</div>

				{conversation ? (
					<div className="flex-1 space-y-6 smooth-div px-4 pt-6">
						<section className="space-y-3">
							<h3 className="text-xs font-sans font-medium uppercase tracking-wide text-muted-foreground">
								Conversation
							</h3>
							<div className="space-y-3 border-b pb-4">
								<DetailRow
									icon={EyeLinear}
									label="Visibility"
									value={
										conversation.visibility ? (
											<Badge
												variant="outline"
												className="capitalize">
												{conversation.visibility}
											</Badge>
										) : undefined
									}
								/>
								<DetailRow
									icon={PenLinear}
									label="Created at"
									value={formatDate(conversation.createdAt)}
								/>

								<DetailRow
									label="High priority"
									icon={SolarStarLinear}
									value={
										conversation.isHighPriority
											? "Yes"
											: "No"
									}
								/>
							</div>
						</section>

						<section className="space-y-3">
							<h3 className="text-xs font-sans font-medium uppercase tracking-wide text-muted-foreground">
								Assignment
							</h3>
							<div className="space-y-3 border-b pb-4">
								<DetailRow
									icon={UserLinear}
									label="Assigned to"
									value={
										conversation.assignedTo ? (
											<Badge
												variant="secondary"
												className="font-medium">
												{assignedUserName ??
													"Assigned member"}
											</Badge>
										) : (
											<Badge variant="outline">
												Unassigned
											</Badge>
										)
									}
								/>
							</div>
						</section>

						<section className="space-y-3">
							<h3 className="text-xs font-sans font-medium uppercase tracking-wide text-muted-foreground">
								Participant Info
							</h3>
							<div className="space-y-3">
								{participantDetails.map((detail) => (
									<DetailRow
										key={detail.label}
										label={detail.label}
										value={detail.value}
										icon={detail.icon}
									/>
								))}
							</div>
						</section>
					</div>
				) : (
					<div className="flex flex-1 items-center justify-center px-4 pb-6 text-xs text-muted-foreground">
						Select a chat to view details.
					</div>
				)}
			</DrawerContent>
		</Drawer>
	);
};
