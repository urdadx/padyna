import { useQuery } from "@tanstack/react-query";
import { WidgetIcon } from "@/assets/icons/widget-icon";
import { WidgetInstructions } from "./widget-instructions";
import { WebsiteInstructions } from "./website-instructions";
import { QRCodeInstructions } from "./qrcode-instructions";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { HugeRocket } from "@/assets/icons/rocket";
import { WebsiteIcon } from "@/assets/icons/website-icon";
import { QrCodeIcon } from "@/assets/icons/qrcode-icon";
import { useRouteContext } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Spinner from "./ui/spinner";
import { TelegramIcon } from "@/assets/icons/telegram-icon";
import { TelegramInstructions } from "./telegram-instructions";

export const DeployAgentDialog = () => {
	const { session } = useRouteContext({ from: "/(admin)" });
	const [isOpen, setIsOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<"widget" | "link" | "qr" | "telegram">("widget");
	const chatbotId = session?.session.activeChatbot;

	const { data: chatbot, isLoading } = useQuery({
		...trpc.agentsettings.getChatbot.queryOptions({ id: chatbotId! }),
		enabled: !!chatbotId,
	});

	if (!chatbot || isLoading) {
		return (
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger>
					<Button className="text-white hover:text-white" variant="default">
						<HugeRocket color="white" />
						<span className="flex sm:hidden">Deploy</span>
						<span className="hidden sm:flex">Deploy your agent</span>
					</Button>
				</DialogTrigger>
				<DialogContent
					showCloseButton={false}
					className="w-full p-0 max-w-4xl! onboarding-height bg-gray-50 rounded-xl overflow-hidden">
					<div className="flex items-center justify-center p-8">
						<Spinner />
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger>
				<Button className="text-white hover:text-white" variant="default">
					<HugeRocket color="white" />
					<span className="flex sm:hidden">Deploy</span>
					<span className="hidden sm:flex">Deploy your agent</span>
				</Button>
			</DialogTrigger>
			<DialogContent
				showCloseButton={false}
				className="w-full p-0 max-w-4xl! onboarding-height bg-gray-50 rounded-xl overflow-visible">
				<div className="flex ">
					<div className="flex w-75 flex-col px-8 py-10">
						<div className="mb-9">
							<h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
								Deploy your agent
							</h2>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								Set up your agent and start handling customer
								support today.
							</p>
						</div>
						<div className="flex-1">
							<div className="-mx-3 flex flex-col gap-4">
								<button
									onClick={() => setActiveTab("widget")}
									className={cn(
										"group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
										activeTab === "widget"
											? "bg-white text-gray-900 shadow-xs ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
											: "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
									)}>
									{activeTab === "widget" && (
										<div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-purple-500"></div>
									)}
									<div className="flex h-5 w-5 shrink-0 items-center justify-center">
										<WidgetIcon />
									</div>
									<span className="flex-1 text-sm font-medium">
										Install the widget
									</span>
								</button>
								<button
									onClick={() => setActiveTab("link")}
									className={cn(
										"group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
										activeTab === "link"
											? "bg-white text-gray-900 shadow-xs ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
											: "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
									)}>
									{activeTab === "link" && (
										<div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-green-500"></div>
									)}
									<div className="flex h-5 w-5 shrink-0 items-center justify-center">
										<WebsiteIcon
											color={
												activeTab === "link"
													? "green"
													: "gray"
											}
										/>
									</div>
									<span className="flex-1 text-sm font-medium">
										Share via website link
									</span>
								</button>
								<button
									onClick={() => setActiveTab("telegram")}
									className={cn(
										"group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
										activeTab === "telegram"
											? "bg-white text-gray-900 shadow-xs ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
											: "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
									)}>
									{activeTab === "telegram" && (
										<div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-300"></div>
									)}
									<div className="flex h-5 w-5 shrink-0 items-center justify-center">
										<TelegramIcon
											color={
												activeTab === "telegram"
													? "#0088CC"
													: "gray"
											}
										/>
									</div>
									<span className="flex-1 text-sm font-medium">
										Share via telegram
									</span>
								</button>
								<button
									onClick={() => setActiveTab("qr")}
									className={cn(
										"group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
										activeTab === "qr"
											? "bg-white text-gray-900 shadow-xs ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
											: "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
									)}>
									{activeTab === "qr" && (
										<div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-red-500"></div>
									)}
									<div className="flex h-5 w-5 shrink-0 items-center justify-center">
										<QrCodeIcon
											color={
												activeTab === "qr"
													? "red"
													: "gray"
											}
										/>
									</div>
									<span className="flex-1 text-sm font-medium">
										Download the QR code
									</span>
								</button>
							</div>
						</div>
					</div>
					{activeTab === "widget" && (
						<WidgetInstructions
							chatbot={chatbot}
							onClose={() => setIsOpen(false)}
						/>
					)}
					{activeTab === "link" && (
						<WebsiteInstructions
							chatbot={chatbot}
							onClose={() => setIsOpen(false)}
						/>
					)}
					{activeTab === "qr" && (
						<QRCodeInstructions
							chatbot={chatbot}
							onClose={() => setIsOpen(false)}
						/>
					)}
					{activeTab === "telegram" && (
						<TelegramInstructions
							chatbot={chatbot}
							onClose={() => setIsOpen(false)}
						/>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};
