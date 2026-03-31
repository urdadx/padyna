import { RestartLinear } from "@/assets/icons/restart-icon";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";

interface Chatbot {
  name: string | null;
  image: string | null;
  primaryColor: string;
}

interface AgentHeaderProps {
  chatbot?: Chatbot | null;
  isLoading?: boolean;
  onReset?: () => void;
}

export const AgentHeader = ({ chatbot, isLoading, onReset }: AgentHeaderProps) => {
  return (
    <div className="flex h-16 items-center justify-between border-b px-5">
      <div className="flex items-center gap-3">
        {isLoading ? (
          <Skeleton className="w-9 h-9 rounded-md" />
        ) : (
          <Avatar
            className="w-9 h-9 rounded-md border-primary"
            style={{ borderColor: chatbot?.primaryColor || "#6366f1" }}
          >
            <AvatarImage className="rounded-md" src={chatbot?.image || ""} />
            {!chatbot?.image && (
              <AvatarFallback
                className="font-semibold rounded-md"
                style={{
                  backgroundColor: chatbot?.primaryColor || "#6366f1",
                  color: "white",
                }}
              >
                {chatbot?.name?.charAt(0) || "A"}
              </AvatarFallback>
            )}
          </Avatar>
        )}
        <div>
          {isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <p className="text-sm font-medium capitalize tracking-tight">
              {chatbot?.name || "Agent"}
            </p>
          )}
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onReset}
            disabled={isLoading}
          >
            <RestartLinear color="black" className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Restart conversation</TooltipContent>
      </Tooltip>
    </div>
  );
};
