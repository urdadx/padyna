import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import Spinner from "../ui/spinner";
import type { IntegrationCardData } from "./types";

type GoogleDriveStatusResponse = {
  connected: boolean;
  integration: {
    accountEmail?: string | null;
  } | null;
};

export function GoogleDriveIntegrationCard({ data }: { data: IntegrationCardData }) {
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const accountEmailRef = useRef<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const clearPollTimer = () => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const fetchGoogleDriveStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await api.get<GoogleDriveStatusResponse>(
        "/api/integrations/google-drive/status",
      );
      setIsConnected(Boolean(response.data.connected));
      accountEmailRef.current = response.data.integration?.accountEmail ?? null;
    } catch {
      setIsConnected(false);
      accountEmailRef.current = null;
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    void fetchGoogleDriveStatus();

    return () => {
      clearPollTimer();
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  const handleGoogleDriveConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await api.get<{ authorizeUrl: string }>(
        "/api/integrations/google-drive/connect",
      );
      const authorizeUrl = response.data.authorizeUrl;

      if (!authorizeUrl) {
        toast.error("Missing Google Drive authorization URL");
        setIsConnecting(false);
        return;
      }

      const popup = window.open(
        authorizeUrl,
        "google-drive-oauth",
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
          await fetchGoogleDriveStatus();
          setIsConnecting(false);
          return;
        }

        try {
          const statusResponse = await api.get<GoogleDriveStatusResponse>(
            "/api/integrations/google-drive/status",
          );

          if (statusResponse.data.connected) {
            setIsConnected(true);
            accountEmailRef.current = statusResponse.data.integration?.accountEmail ?? null;
            popupRef.current.close();
            clearPollTimer();
            setIsConnecting(false);
            toast.success("Google Drive connected");
          }
        } catch {
          // Ignore transient polling failures.
        }
      }, 1000);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to start Google Drive OAuth flow");
      setIsConnecting(false);
    }
  };

  const handleGoogleDriveDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await api.delete("/api/integrations/google-drive/disconnect");
      setIsConnected(false);
      accountEmailRef.current = null;
      toast.success("Google Drive disconnected");
    } catch {
      toast.error("Failed to disconnect. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleClick = () => {
    if (isConnected) {
      void handleGoogleDriveDisconnect();
      return;
    }

    void handleGoogleDriveConnect();
  };

  return (
    <div className="bg-white rounded-xl p-3 border border-gray-200 w-full max-w-md mx-auto h-full">
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
              Active
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
          onClick={handleClick}
        >
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
