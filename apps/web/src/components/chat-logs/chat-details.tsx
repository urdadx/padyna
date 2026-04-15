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

function formatDate(value: Date | string | null | undefined) {
	if (!value) {
		return "Not available";
	}

	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "Not available";
	}

	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
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

export const ChatDetails = ({
	isOpen,
	onOpenChange,
	conversation,
	assignedUserName,
}: ChatDetailsProps) => {
	const metadata = conversation?.metadata as Record<string, any> | undefined;

	const location = [metadata?.city?.trim(), metadata?.country?.trim()]
		.filter(Boolean)
		.join(", ");

	const browser = metadata?.deviceInfo?.browser?.trim();
	const os = metadata?.deviceInfo?.os?.trim();
	const deviceType = metadata?.deviceInfo?.type?.trim();
	const deviceModel = metadata?.deviceInfo?.model?.trim();
	const isMobile = useIsMobile();

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
								Visitor Info
							</h3>
							<div className="space-y-3">
								<DetailRow
									icon={LocationLinear}
									label="Location"
									value={location || undefined}
								/>
								<DetailRow
									label="Device"
									icon={MobilePhoneLinear}
									value={
										[deviceType, deviceModel]
											.filter(Boolean)
											.join(" • ") || undefined
									}
								/>
								<DetailRow
									label="Browser"
									value={browser}
									icon={GlobeLinear}
								/>
								<DetailRow
									icon={SolarBoxMinimalisticLinear}
									label="Operating system"
									value={os}
								/>
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
