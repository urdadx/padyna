import { useEffect, useReducer, useRef } from "react";
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

type SlackState = {
	isLoadingStatus: boolean;
	isConnecting: boolean;
	isDisconnecting: boolean;
	isLoadingChannels: boolean;
	isSavingChannel: boolean;
	isConnected: boolean;
	integration: SlackIntegrationStatus | null;
	channels: SlackChannel[];
	selectedChannelId: string;
	channelError: string | null;
	isSetupDialogOpen: boolean;
};

type SlackAction =
	| { type: "merge"; payload: Partial<SlackState> }
	| { type: "statusFailed" }
	| {
			type: "statusLoaded";
			connected: boolean;
			integration: SlackIntegrationStatus | null;
	  }
	| {
			type: "channelsLoaded";
			channelId: string | null;
			channels: SlackChannel[];
	  }
	| { type: "disconnectSuccess" };

const initialSlackState: SlackState = {
	isLoadingStatus: false,
	isConnecting: false,
	isDisconnecting: false,
	isLoadingChannels: false,
	isSavingChannel: false,
	isConnected: false,
	integration: null,
	channels: [],
	selectedChannelId: "",
	channelError: null,
	isSetupDialogOpen: false,
};

function slackReducer(state: SlackState, action: SlackAction): SlackState {
	switch (action.type) {
		case "merge":
			return { ...state, ...action.payload };
		case "statusLoaded":
			return {
				...state,
				isConnected: action.connected,
				integration: action.integration,
				isLoadingStatus: false,
				isSetupDialogOpen: Boolean(action.integration?.isPending),
				selectedChannelId: action.integration?.channelId ?? "",
			};
		case "statusFailed":
			return {
				...state,
				isConnected: false,
				integration: null,
				isLoadingStatus: false,
				isSetupDialogOpen: false,
				selectedChannelId: "",
			};
		case "channelsLoaded":
			return {
				...state,
				channels: action.channels,
				isLoadingChannels: false,
				selectedChannelId: state.selectedChannelId || action.channelId || "",
			};
		case "disconnectSuccess":
			return {
				...state,
				channels: [],
				channelError: null,
				integration: null,
				isConnected: false,
				isDisconnecting: false,
				isSetupDialogOpen: false,
				selectedChannelId: "",
			};
	}
}

export function SlackIntegrationCard({ data }: { data: IntegrationCardData }) {
	const [state, dispatch] = useReducer(slackReducer, initialSlackState);
	const {
		channelError,
		channels,
		integration,
		isConnected,
		isConnecting,
		isDisconnecting,
		isLoadingChannels,
		isLoadingStatus,
		isSavingChannel,
		isSetupDialogOpen,
		selectedChannelId,
	} = state;

	const popupRef = useRef<Window | null>(null);
	const pollTimerRef = useRef<number | null>(null);

	const clearPollTimer = () => {
		if (pollTimerRef.current) {
			window.clearInterval(pollTimerRef.current);
			pollTimerRef.current = null;
		}
	};

	const fetchSlackStatus = async () => {
		dispatch({ type: "merge", payload: { isLoadingStatus: true } });
		try {
			const response = await api.get<SlackStatusResponse>(
				"/api/integrations/slack/status",
			);

			dispatch({
				type: "statusLoaded",
				connected: Boolean(response.data.connected),
				integration: response.data.integration ?? null,
			});
		} catch {
			dispatch({ type: "statusFailed" });
		}
	};

	const fetchSlackChannels = async () => {
		if (!integration) {
			return;
		}

		dispatch({
			type: "merge",
			payload: { channelError: null, isLoadingChannels: true },
		});

		try {
			const response = await api.get<SlackChannelsResponse>(
				"/api/integrations/slack/channels",
			);

			dispatch({
				type: "channelsLoaded",
				channelId: response.data.channelId,
				channels: response.data.channels ?? [],
			});
		} catch (error: any) {
			dispatch({
				type: "merge",
				payload: {
					channels: [],
					channelError:
						error?.response?.data?.message || "Failed to load Slack channels",
					isLoadingChannels: false,
				},
			});
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
			dispatch({ type: "merge", payload: { channels: [], channelError: null } });
			return;
		}

		void fetchSlackChannels();
	}, [integration?.id, integration?.isPending, isSetupDialogOpen]);

	const handleSlackConnect = async () => {
		dispatch({ type: "merge", payload: { isConnecting: true } });
		try {
			const response = await api.get<{ authorizeUrl: string }>(
				"/api/integrations/slack/connect",
			);
			const authorizeUrl = response.data.authorizeUrl;

			if (!authorizeUrl) {
				toast.error("Missing Slack authorization URL");
				dispatch({ type: "merge", payload: { isConnecting: false } });
				return;
			}

			const popup = window.open(
				authorizeUrl,
				"slack-oauth",
				"width=700,height=760,left=200,top=100",
			);

			if (!popup) {
				toast.error("Popup blocked. Please allow popups and try again.");
				dispatch({ type: "merge", payload: { isConnecting: false } });
				return;
			}

			popupRef.current = popup;
			clearPollTimer();

			pollTimerRef.current = window.setInterval(async () => {
				if (!popupRef.current || popupRef.current.closed) {
					clearPollTimer();
					await fetchSlackStatus();
					dispatch({ type: "merge", payload: { isConnecting: false } });
					return;
				}

				try {
					const statusResponse = await api.get<SlackStatusResponse>(
						"/api/integrations/slack/status",
					);

					const pendingIntegration = statusResponse.data.integration;
					if (statusResponse.data.connected || pendingIntegration?.isPending) {
						dispatch({
							type: "statusLoaded",
							connected: Boolean(statusResponse.data.connected),
							integration: pendingIntegration ?? null,
						});
						popupRef.current.close();
						clearPollTimer();
						dispatch({ type: "merge", payload: { isConnecting: false } });

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
			dispatch({ type: "merge", payload: { isConnecting: false } });
		}
	};

	const handleSlackDisconnect = async () => {
		dispatch({ type: "merge", payload: { isDisconnecting: true } });
		try {
			await api.delete("/api/integrations/slack/disconnect");
			dispatch({ type: "disconnectSuccess" });
			toast.success("Slack disconnected");
		} catch (error) {
			console.log("Error disconnecting Slack integration:", error);
			toast.error("Failed to disconnect. Please try again.");
		} finally {
			dispatch({ type: "merge", payload: { isDisconnecting: false } });
		}
	};

	const handleSaveChannel = async () => {
		if (!selectedChannelId) {
			toast.error("Select a Slack channel first.");
			return;
		}

		dispatch({ type: "merge", payload: { isSavingChannel: true } });
		try {
			await api.post("/api/integrations/slack/channel", {
				channelId: selectedChannelId,
			});
			await fetchSlackStatus();
			dispatch({ type: "merge", payload: { isSetupDialogOpen: false } });
			toast.success("Slack channel configured");
		} catch (error: any) {
			const message = error?.response?.data?.message || "Failed to save Slack channel";
			toast.error(message);
		} finally {
			dispatch({ type: "merge", payload: { isSavingChannel: false } });
		}
	};

	const handleClick = () => {
		if (needsChannelSelection) {
			dispatch({ type: "merge", payload: { isSetupDialogOpen: true } });
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
			<AlertDialog
				open={isSetupDialogOpen}
				onOpenChange={(open) => dispatch({ type: "merge", payload: { isSetupDialogOpen: open } })}
			>
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
								dispatch({ type: "merge", payload: { selectedChannelId: value ?? "" } })
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
							onClick={() => dispatch({ type: "merge", payload: { isSetupDialogOpen: false } })}>
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
