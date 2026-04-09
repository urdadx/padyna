import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import Spinner from "../ui/spinner";
import type { IntegrationCardData } from "./types";
import { AlertCircleIcon } from "lucide-react";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../ui/alert-dialog";

type SlackIntegrationStatus = {
	id: string;
	teamId: string;
	channelId: string | null;
	isPending: boolean;
};

type SlackStatusResponse = {
	connected: boolean;
	integration: SlackIntegrationStatus | null;
};

type SlackChannel = {
	id: string;
	name: string;
	isPrivate: boolean;
};

type SlackChannelsResponse = {
	channelId: string | null;
	channels: SlackChannel[];
	teamId: string;
};

export function SlackIntegrationCard({ data }: { data: IntegrationCardData }) {
	const [isLoadingStatus, setIsLoadingStatus] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isDisconnecting, setIsDisconnecting] = useState(false);
	const [isLoadingChannels, setIsLoadingChannels] = useState(false);
	const [isSavingChannel, setIsSavingChannel] = useState(false);
	const [isConnected, setIsConnected] = useState(false);
	const [integration, setIntegration] = useState<SlackIntegrationStatus | null>(null);
	const [channels, setChannels] = useState<SlackChannel[]>([]);
	const [selectedChannelId, setSelectedChannelId] = useState("");
	const [channelError, setChannelError] = useState<string | null>(null);
	const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);

	const popupRef = useRef<Window | null>(null);
	const pollTimerRef = useRef<number | null>(null);

	const clearPollTimer = () => {
		if (pollTimerRef.current) {
			window.clearInterval(pollTimerRef.current);
			pollTimerRef.current = null;
		}
	};

	const fetchSlackStatus = async () => {
		setIsLoadingStatus(true);
		try {
			const response = await api.get<SlackStatusResponse>(
				"/api/integrations/slack/status",
			);

			setIsConnected(Boolean(response.data.connected));
			setIntegration(response.data.integration ?? null);
			setSelectedChannelId(response.data.integration?.channelId ?? "");
			setIsSetupDialogOpen(Boolean(response.data.integration?.isPending));
		} catch {
			setIsConnected(false);
			setIntegration(null);
			setSelectedChannelId("");
			setIsSetupDialogOpen(false);
		} finally {
			setIsLoadingStatus(false);
		}
	};

	const fetchSlackChannels = async () => {
		if (!integration) {
			return;
		}

		setIsLoadingChannels(true);
		setChannelError(null);

		try {
			const response = await api.get<SlackChannelsResponse>(
				"/api/integrations/slack/channels",
			);

			setChannels(response.data.channels ?? []);
			setSelectedChannelId(
				(currentValue) => currentValue || response.data.channelId || "",
			);
		} catch (error: any) {
			setChannels([]);
			setChannelError(
				error?.response?.data?.message || "Failed to load Slack channels",
			);
		} finally {
			setIsLoadingChannels(false);
		}
	};

	useEffect(() => {
		void fetchSlackStatus();

		return () => {
			clearPollTimer();
			if (popupRef.current && !popupRef.current.closed) {
				popupRef.current.close();
			}
		};
	}, []);

	useEffect(() => {
		if (!integration?.isPending || !isSetupDialogOpen) {
			setChannels([]);
			setChannelError(null);
			return;
		}

		void fetchSlackChannels();
	}, [integration?.id, integration?.isPending, isSetupDialogOpen]);

	const handleSlackConnect = async () => {
		setIsConnecting(true);
		try {
			const response = await api.get<{ authorizeUrl: string }>(
				"/api/integrations/slack/connect",
			);
			const authorizeUrl = response.data.authorizeUrl;

			if (!authorizeUrl) {
				toast.error("Missing Slack authorization URL");
				setIsConnecting(false);
				return;
			}

			const popup = window.open(
				authorizeUrl,
				"slack-oauth",
				"width=700,height=760,left=200,top=100",
			);

			if (!popup) {
				toast.error("Popup blocked. Please allow popups and try again.");
				setIsConnecting(false);
				return;
			}

			popupRef.current = popup;
			clearPollTimer();

			pollTimerRef.current = window.setInterval(async () => {
				if (!popupRef.current || popupRef.current.closed) {
					clearPollTimer();
					await fetchSlackStatus();
					setIsConnecting(false);
					return;
				}

				try {
					const statusResponse = await api.get<SlackStatusResponse>(
						"/api/integrations/slack/status",
					);

					const pendingIntegration = statusResponse.data.integration;
					if (statusResponse.data.connected || pendingIntegration?.isPending) {
						setIsConnected(Boolean(statusResponse.data.connected));
						setIntegration(pendingIntegration ?? null);
						setSelectedChannelId(pendingIntegration?.channelId ?? "");
						setIsSetupDialogOpen(Boolean(pendingIntegration?.isPending));
						popupRef.current.close();
						clearPollTimer();
						setIsConnecting(false);

						if (pendingIntegration?.isPending) {
							toast.success(
								"Slack installed. Choose a channel to finish setup.",
							);
						} else {
							toast.success("Slack connected");
						}
					}
				} catch {
					// Ignore transient polling failures.
				}
			}, 1000);
		} catch (error: any) {
			const message =
				error?.response?.data?.message || "Failed to start Slack OAuth flow";
			toast.error(message);
			setIsConnecting(false);
		}
	};

	const handleSlackDisconnect = async () => {
		setIsDisconnecting(true);
		try {
			await api.delete("/api/integrations/slack/disconnect");
			setIsConnected(false);
			setIntegration(null);
			setIsSetupDialogOpen(false);
			setChannels([]);
			setSelectedChannelId("");
			setChannelError(null);
			toast.success("Slack disconnected");
		} catch (error) {
			console.log("Error disconnecting Slack integration:", error);
			toast.error("Failed to disconnect. Please try again.");
		} finally {
			setIsDisconnecting(false);
		}
	};

	const handleSaveChannel = async () => {
		if (!selectedChannelId) {
			toast.error("Select a Slack channel first.");
			return;
		}

		setIsSavingChannel(true);
		try {
			await api.post("/api/integrations/slack/channel", {
				channelId: selectedChannelId,
			});
			await fetchSlackStatus();
			setIsSetupDialogOpen(false);
			toast.success("Slack channel configured");
		} catch (error: any) {
			const message = error?.response?.data?.message || "Failed to save Slack channel";
			toast.error(message);
		} finally {
			setIsSavingChannel(false);
		}
	};

	const handleClick = () => {
		if (needsChannelSelection) {
			setIsSetupDialogOpen(true);
			return;
		}

		if (integration) {
			void handleSlackDisconnect();
			return;
		}

		void handleSlackConnect();
	};

	const channelItems = channels.map((channel) => ({
		label: channel.isPrivate ? `${channel.name} (Private)` : `#${channel.name}`,
		value: channel.id,
	}));
	const needsChannelSelection = Boolean(integration?.isPending);

	return (
		<div className="bg-white rounded-xl p-3 border border-gray-200  w-full max-w-md mx-auto h-full">
			<AlertDialog open={isSetupDialogOpen} onOpenChange={setIsSetupDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader className="pb-0">
						<AlertDialogTitle className="text-xl font-semibold">
							Choose Slack Channel
						</AlertDialogTitle>
						<AlertDialogDescription>
							Select a channel where this bot should be installed.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<div className="space-y-3">
						{channelError ? (
							<p className="text-sm text-red-500">{channelError}</p>
						) : null}
						<Select
							items={channelItems}
							value={selectedChannelId}
							onValueChange={(value) =>
								setSelectedChannelId(value ?? "")
							}
							disabled={isLoadingChannels || channelItems.length === 0}>
							<SelectTrigger className="w-full">
								<SelectValue
									placeholder={
										isLoadingChannels
											? "Loading channels..."
											: "Slack channel"
									}
								/>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Slack channels</SelectLabel>
									{channelItems.map((item) => (
										<SelectItem
											key={item.value}
											value={item.value}>
											{item.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground flex items-center">
							<AlertCircleIcon className="size-3 inline-block mr-1" />
							The agent will only reply in the selected channel.
						</p>
					</div>

					<AlertDialogFooter>
						<Button
							variant="outline"
							disabled={isSavingChannel}
							onClick={() => setIsSetupDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							disabled={
								isLoadingChannels ||
								isSavingChannel ||
								channelItems.length === 0 ||
								!selectedChannelId
							}
							onClick={() => void handleSaveChannel()}>
							{isSavingChannel ? (
								<>
									<Spinner className="text-white" /> Saving...
								</>
							) : (
								"Save channel"
							)}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<div className="flex flex-col gap-2 h-full">
				<div className="flex justify-between items-center gap-2">
					<div className="flex items-center gap-2">
						<img
							className="size-7 sm:size-8"
							src={data.logo}
							alt="integration-icon"
							loading="lazy"
						/>
					</div>
					{isConnected ? (
						<Badge variant="outline" className="gap-1 text-xs">
							<span className="size-2 rounded-full bg-green-500"></span>
							Active
						</Badge>
					) : needsChannelSelection ? (
						<Badge variant="outline" className="text-xs">
							Setup required
						</Badge>
					) : null}
				</div>
				<h3 className="font-medium font-sans text-sm sm:text-base">{data.name}</h3>
				<p className="text-gray-600 text-sm sm:text-md grow">{data.description}</p>

				<Button
					size="sm"
					className="w-fit rounded-sm text-sm"
					variant="outline"
					disabled={
						isLoadingStatus ||
						isConnecting ||
						isDisconnecting ||
						isSavingChannel
					}
					onClick={handleClick}>
					{isConnecting ? (
						<>
							<Spinner /> Connecting...
						</>
					) : isDisconnecting ? (
						<>
							<Spinner /> Disconnecting...
						</>
					) : needsChannelSelection ? (
						"Finish setup"
					) : integration ? (
						"Disconnect"
					) : (
						"Connect"
					)}
				</Button>
			</div>
		</div>
	);
}
