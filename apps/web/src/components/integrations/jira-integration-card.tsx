import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import Spinner from "../ui/spinner";
import type { IntegrationCardData } from "./types";

type JiraStatusResponse = {
	connected: boolean;
	integration: {
		siteName?: string | null;
		tokenExpired?: boolean;
	} | null;
};

export function JiraIntegrationCard({ data }: { data: IntegrationCardData }) {
	const [isLoadingStatus, setIsLoadingStatus] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isDisconnecting, setIsDisconnecting] = useState(false);
	const [isConnected, setIsConnected] = useState(false);
	const [_siteName, setSiteName] = useState<string | null>(null);

	const popupRef = useRef<Window | null>(null);
	const pollTimerRef = useRef<number | null>(null);

	const clearPollTimer = () => {
		if (pollTimerRef.current) {
			window.clearInterval(pollTimerRef.current);
			pollTimerRef.current = null;
		}
	};

	const fetchJiraStatus = async () => {
		setIsLoadingStatus(true);
		try {
			const response = await api.get<JiraStatusResponse>(
				"/api/integrations/jira/status",
			);

			setIsConnected(Boolean(response.data.connected));
			setSiteName(response.data.integration?.siteName ?? null);

			if (response.data.integration?.tokenExpired) {
				toast.error("Your Jira connection expired. Reconnect the integration.");
			}
		} catch (error: any) {
			setIsConnected(false);
			setSiteName(null);

			if (error?.response?.status === 401) {
				toast.error(
					error?.response?.data?.message ||
						"Your Jira connection expired. Reconnect the integration.",
				);
			}
		} finally {
			setIsLoadingStatus(false);
		}
	};

	useEffect(() => {
		void fetchJiraStatus();

		return () => {
			clearPollTimer();
			if (popupRef.current && !popupRef.current.closed) {
				popupRef.current.close();
			}
		};
	}, []);

	const handleJiraConnect = async () => {
		setIsConnecting(true);
		try {
			const response = await api.get<{ authorizeUrl: string }>(
				"/api/integrations/jira/connect",
			);
			const authorizeUrl = response.data.authorizeUrl;

			if (!authorizeUrl) {
				toast.error("Missing Jira authorization URL");
				setIsConnecting(false);
				return;
			}

			const popup = window.open(
				authorizeUrl,
				"jira-oauth",
				"width=600,height=760,left=200,top=100",
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
					await fetchJiraStatus();
					setIsConnecting(false);
					return;
				}

				try {
					const statusResponse = await api.get<JiraStatusResponse>(
						"/api/integrations/jira/status",
					);

					if (statusResponse.data.connected) {
						setIsConnected(true);
						setSiteName(statusResponse.data.integration?.siteName ?? null);
						popupRef.current.close();
						clearPollTimer();
						setIsConnecting(false);
						toast.success("Jira connected");
					}
				} catch {
					// Ignore transient polling failures.
				}
			}, 1000);
		} catch (error: any) {
			const message =
				error?.response?.data?.message || "Failed to start Jira OAuth flow";
			toast.error(message);
			setIsConnecting(false);
		}
	};

	const handleJiraDisconnect = async () => {
		setIsDisconnecting(true);
		try {
			await api.delete("/api/integrations/jira/disconnect");
			setIsConnected(false);
			setSiteName(null);
			toast.success("Jira disconnected");
		} catch (error: any) {
			console.log("Error disconnecting Jira integration:", error);
			toast.error("Failed to disconnect. Please try again.");
		} finally {
			setIsDisconnecting(false);
		}
	};

	const handleClick = () => {
		if (isConnected) {
			void handleJiraDisconnect();
			return;
		}

		void handleJiraConnect();
	};

	return (
		<div className="bg-white rounded-xl p-3 border border-gray-200  w-full max-w-md mx-auto h-full">
			<div className="flex flex-col gap-2 h-full">
				<div className="flex justify-between items-center">
					<div className="flex items-center gap-2">
						<img
							className="size-7 sm:size-8"
							src={data.logo}
							alt="integration-icon"
							loading="lazy"
						/>
					</div>
					{isConnected && (
						<Badge variant="outline" className="gap-1 text-xs">
							<span className="size-2 rounded-full bg-green-500"></span>
							Connected
						</Badge>
					)}
				</div>
				<h3 className="font-medium font-sans text-sm sm:text-base">{data.name}</h3>
				<p className="text-gray-600 text-sm sm:text-md grow">{data.description}</p>
				<Button
					size="sm"
					className="w-fit rounded-sm text-sm"
					variant="outline"
					disabled={isLoadingStatus || isConnecting || isDisconnecting}
					onClick={handleClick}>
					{isConnecting ? (
						<>
							<Spinner /> Connecting...
						</>
					) : isDisconnecting ? (
						<>
							<Spinner /> Disconnecting...
						</>
					) : isConnected ? (
						"Disconnect"
					) : (
						"Connect"
					)}
				</Button>
			</div>
		</div>
	);
}
