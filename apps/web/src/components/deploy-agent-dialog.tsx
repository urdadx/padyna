import { useQuery } from "@tanstack/react-query";
import { WidgetIcon } from "@/assets/icons/widget-icon";
import { WidgetInstructions } from "./widget-instructions";
import { WebsiteInstructions } from "./website-instructions";
import { QRCodeInstructions } from "./qrcode-instructions";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTrigger } from "./ui/drawer";
import { HugeRocket } from "@/assets/icons/rocket";
import { WebsiteIcon } from "@/assets/icons/website-icon";
import { QrCodeIcon } from "@/assets/icons/qrcode-icon";
import { trpc } from "@/utils/trpc";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Spinner from "./ui/spinner";
import { TelegramIcon } from "@/assets/icons/telegram-icon";
import { TelegramInstructions } from "./telegram-instructions";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSession } from "@/lib/auth-client";
import { RobotIcon } from "@/assets/icons/robot";
import { AgentPromptInstructions } from "./agent-prompt-instructions";

const DeployTriggerButton = () => (
  <Button className="text-white hover:text-white" variant="default">
    <HugeRocket color="white" />
    <span className="flex sm:hidden">Deploy</span>
    <span className="hidden sm:flex">Deploy your agent</span>
  </Button>
);

export const DeployAgentDialog = () => {
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"widget" | "link" | "qr" | "telegram" | "agent">(
    "widget",
  );
  const chatbotId = session?.session.activeChatbot;

  const { data: chatbot, isLoading } = useQuery({
    ...trpc.agentsettings.getChatbot.queryOptions({ id: chatbotId! }),
    enabled: !!chatbotId,
  });

  if (!chatbot || isLoading) {
    if (isMobile) {
      return (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger>
            <DeployTriggerButton />
          </DrawerTrigger>
          <DrawerContent className="p-4">
            <div className="flex items-center justify-center p-8">
              <Spinner />
            </div>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger>
          <DeployTriggerButton />
        </DialogTrigger>
        <DialogContent
          showCloseButton={false}
          className="w-full p-0 max-w-4xl! onboarding-height bg-gray-50 rounded-xl overflow-hidden"
        >
          <div className="flex items-center justify-center p-8">
            <Spinner />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const NavButtons = (
    <div
      className={cn(
        "flex gap-2",
        isMobile
          ? "flex-row overflow-x-auto pb-4 pt-1 px-4 scrollbar-hide -mx-4 border-b border-gray-100"
          : "flex-col -mx-3 gap-4",
      )}
    >
      <button
        onClick={() => setActiveTab("widget")}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-4 py-2 text-left transition-all",
          isMobile ? "shrink-0 min-w-max border" : "w-full",
          activeTab === "widget"
            ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200 border-purple-100 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-transparent dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
        )}
      >
        {activeTab === "widget" && (
          <div
            className={cn(
              "bg-purple-800",
              isMobile
                ? "absolute -bottom-px left-0 right-0 h-0.5"
                : "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full",
            )}
          ></div>
        )}
        <div className="flex h-4 w-4 shrink-0 items-center justify-center">
          <WidgetIcon color={activeTab === "widget" ? "purple" : "gray"} />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">Widget</span>
      </button>

      <button
        onClick={() => setActiveTab("telegram")}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-4 py-2 text-left transition-all",
          isMobile ? "shrink-0 min-w-max border" : "w-full",
          activeTab === "telegram"
            ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200 border-blue-100 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-transparent dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
        )}
      >
        {activeTab === "telegram" && (
          <div
            className={cn(
              "bg-blue-300",
              isMobile
                ? "absolute -bottom-px left-0 right-0 h-0.5"
                : "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full",
            )}
          ></div>
        )}
        <div className="flex h-4 w-4 shrink-0 items-center justify-center">
          <TelegramIcon color={activeTab === "telegram" ? "#0088CC" : "gray"} />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">Telegram</span>
      </button>
      <button
        onClick={() => setActiveTab("link")}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-4 py-2 text-left transition-all",
          isMobile ? "shrink-0 min-w-max border" : "w-full",
          activeTab === "link"
            ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200 border-green-100 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-transparent dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
        )}
      >
        {activeTab === "link" && (
          <div
            className={cn(
              "bg-green-500",
              isMobile
                ? "absolute -bottom-px left-0 right-0 h-0.5"
                : "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full",
            )}
          ></div>
        )}
        <div className="flex h-4 w-4 shrink-0 items-center justify-center">
          <WebsiteIcon color={activeTab === "link" ? "green" : "gray"} />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">Website </span>
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("agent")}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-4 py-2 text-left transition-all",
          isMobile ? "shrink-0 min-w-max border" : "w-full",
          activeTab === "agent"
            ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200 border-red-100 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-transparent dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
        )}
      >
        {activeTab === "agent" && (
          <div
            className={cn(
              "bg-red-600",
              isMobile
                ? "absolute -bottom-px left-0 right-0 h-0.5"
                : "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full",
            )}
          />
        )}
        <div className={cn("flex h-4 w-4 shrink-0 items-center justify-center", activeTab === "agent" ? "text-red-600" : "text-gray-500")}>
          <RobotIcon className="size-5" />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">Agent prompt</span>
      </button>
      <button
        onClick={() => setActiveTab("qr")}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-4 py-2 text-left transition-all",
          isMobile ? "shrink-0 min-w-max border" : "w-full",
          activeTab === "qr"
            ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200 border-red-100 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-transparent dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
        )}
      >
        {activeTab === "qr" && (
          <div
            className={cn(
              "bg-red-500",
              isMobile
                ? "absolute -bottom-px left-0 right-0 h-0.5"
                : "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full",
            )}
          ></div>
        )}
        <div className="flex h-4 w-4 shrink-0 items-center justify-center">
          <QrCodeIcon color={activeTab === "qr" ? "red" : "gray"} />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">QR Code</span>
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger>
          <DeployTriggerButton />
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh] bg-gray-50 flex flex-col">
          <DrawerHeader className="shrink-0 pb-2"></DrawerHeader>
          <div className="sticky top-0 z-10 bg-gray-50 pt-0 pb-2 px-4 shadow-sm">{NavButtons}</div>
          <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
            <div className="bg-white rounded-xl shadow-xs ring-1 ring-gray-200 p-1">
              {activeTab === "widget" && (
                <WidgetInstructions chatbot={chatbot} onClose={() => setIsOpen(false)} />
              )}
              {activeTab === "link" && (
                <WebsiteInstructions chatbot={chatbot} onClose={() => setIsOpen(false)} />
              )}
              {activeTab === "qr" && (
                <QRCodeInstructions chatbot={chatbot} onClose={() => setIsOpen(false)} />
              )}
              {activeTab === "telegram" && (
                <TelegramInstructions chatbot={chatbot} onClose={() => setIsOpen(false)} />
              )}
              {activeTab === "agent" && (
                <AgentPromptInstructions chatbot={chatbot} onClose={() => setIsOpen(false)} />
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <DeployTriggerButton />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="w-full p-0 max-w-4xl! onboarding-height bg-gray-50 rounded-xl overflow-visible"
      >
        <div className="flex ">
          <div className="flex w-75 flex-col px-8 py-10">
            <div className="mb-9">
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Deploy your agent
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set up your agent and start handling customer support today.
              </p>
            </div>
            <div className="flex-1">{NavButtons}</div>
          </div>
          {activeTab === "widget" && (
            <WidgetInstructions chatbot={chatbot} onClose={() => setIsOpen(false)} />
          )}
          {activeTab === "link" && (
            <WebsiteInstructions chatbot={chatbot} onClose={() => setIsOpen(false)} />
          )}
          {activeTab === "qr" && (
            <QRCodeInstructions chatbot={chatbot} onClose={() => setIsOpen(false)} />
          )}
          {activeTab === "telegram" && (
            <TelegramInstructions chatbot={chatbot} onClose={() => setIsOpen(false)} />
          )}
          {activeTab === "agent" && (
            <AgentPromptInstructions chatbot={chatbot} onClose={() => setIsOpen(false)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
