import { Button } from "../ui/button";
import Spinner from "../ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error" | "idle" | "waiting";
type HeaderVariant = "agent" | "visitor";

interface ChatStatusHeaderProps {
	status: ConnectionStatus;
	hasJoined: boolean;
	isPeerJoined?: boolean;
	isConnected: boolean;
	onConnect: () => void;
	onJoin?: () => void;
	onEndSession?: () => void;
	isAssignedToOther?: boolean;
	assignedUserName?: string;
	variant?: HeaderVariant;
}

export const ChatStatusHeader = ({
	status,
	hasJoined,
	isPeerJoined = false,
	isConnected,
	onConnect,
	onJoin,
	onEndSession,
	isAssignedToOther = false,
	assignedUserName = "Another agent",
	variant = "agent",
}: ChatStatusHeaderProps) => {
	const selfLabel = variant === "agent" ? "You" : "You";
	const peerLabel = variant === "agent" ? "user" : "human agent";
	const joinCta = variant === "agent" ? "Join chat" : "Join live chat";
	const connectedLabel =
		variant === "agent" ? "You are now live with the user" : "You are now live with a human agent";
	const readyLabel = variant === "agent" ? "Ready to connect" : "Waiting to join live support";
	const disconnectedLabel = `${selfLabel} are not connected.`;
	const waitingLabel = hasJoined
		? `Waiting for the ${peerLabel} to join...`
		: isPeerJoined
			? `${variant === "agent" ? "User" : "Human agent"} is waiting for you to join.`
			: `Waiting for the ${peerLabel} to join...`;
	const showJoinButton = Boolean(onJoin) && !hasJoined && (status === "connected" || status === "waiting");

	const getBackgroundColor = () => {
		if (status === "connected" && hasJoined) {
			return "bg-green-50 dark:bg-green-950";
		}
		if (status === "connecting") {
			return "bg-blue-50 dark:bg-blue-950";
		}
		if (status === "disconnected" || status === "error") {
			return "bg-yellow-50 dark:bg-yellow-950";
		}
		return "bg-gray-50 dark:bg-gray-950";
	};

	const handleRetryConnection = () => {
		onConnect();
		if (onJoin) {
			onJoin();
		}
	};

	return (
		<div
			className={`border-b flex items-center justify-between px-4 py-2 ${getBackgroundColor()}`}>
			<div className="flex items-center gap-2 text-sm">
				{status === "connected" && hasJoined ? (
					<>
						<div className="size-2 rounded-full bg-green-500 animate-pulse" />
						<span className="font-medium text-green-700 dark:text-green-300">
							{connectedLabel}
						</span>
					</>
				) : status === "connecting" ? (
					<>
						<Spinner className="size-3" />
						<span className="font-medium text-blue-700 dark:text-blue-300">
							Establishing connection...
						</span>
					</>
				) : status === "waiting" ? (
					<>
						<div className="size-2 rounded-full bg-blue-500 animate-pulse" />
						<span className="font-medium text-blue-700 dark:text-blue-300">
							{waitingLabel}
						</span>
					</>
				) : status === "disconnected" ? (
					<>
						<div className="size-2 rounded-full bg-yellow-500" />
						<span className="font-medium text-yellow-700 dark:text-yellow-300">
							{disconnectedLabel}
						</span>
					</>
				) : status === "error" ? (
					<>
						<div className="size-2 rounded-full bg-yellow-500" />
						<span className="font-medium text-yellow-700 dark:text-yellow-300">
							Couldn't connect. Please try again.
						</span>
					</>
				) : (
					<>
						<div className="size-2 rounded-full bg-gray-500" />
						<span className="font-medium text-gray-700 dark:text-gray-300">
							{readyLabel}
						</span>
					</>
				)}
			</div>
			<div className="flex items-center gap-2">
				{showJoinButton && onJoin && (
					<Button onClick={onJoin} variant="outline" size="sm" disabled={isAssignedToOther}>
						{joinCta}
					</Button>
				)}
				{(status === "disconnected" || status === "error") && (
					<Tooltip>
						<TooltipTrigger>
							<Button
								onClick={handleRetryConnection}
								variant="outline"
								size="sm"
								className="text-yellow-700 hover:text-yellow-700 hover:bg-yellow-50 dark:text-yellow-300 dark:hover:text-yellow-300 dark:hover:bg-yellow-950"
								disabled={isAssignedToOther}>
								{status === "error" ? "Try again" : joinCta}
							</Button>
						</TooltipTrigger>
						{isAssignedToOther && (
							<TooltipContent>
								{assignedUserName} has been assigned to this chat.
								You can't engage.
							</TooltipContent>
						)}
					</Tooltip>
				)}
				{hasJoined && isConnected && onEndSession && (
					<Button
						onClick={onEndSession}
						className="text-green-700 hover:text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:text-green-300 dark:hover:bg-green-950"
						variant="outline"
						size="sm">
						End session
					</Button>
				)}
			</div>
		</div>
	);
};
