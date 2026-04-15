import { XIcon } from "lucide-react";
import { Button } from "./ui/button";
import { QrCodeIcon as QrIcon } from "@/assets/icons/qrcode-icon";
import { env } from "@padyna/env/web";
import { QRCodeCanvas } from "qrcode.react";

interface Chatbot {
	embedToken: string | null;
	name: string | null;
}

interface QRCodeInstructionsProps {
	chatbot: Chatbot;
	onClose?: () => void;
}

export const QRCodeInstructions = ({ chatbot, onClose }: QRCodeInstructionsProps) => {
	const websiteUrl = chatbot.embedToken
		? `${env.VITE_FRONTEND_ORIGIN}/widget?widgetId=${chatbot.embedToken}`
		: "";

	const downloadQRCode = () => {
		const canvas = document.getElementById("qr-code") as HTMLCanvasElement;
		if (!canvas) return;
		const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
		const downloadLink = document.createElement("a");
		const chatbotName = (chatbot.name ?? "chatbot").toLowerCase().replace(/\s+/g, "-");
		downloadLink.href = pngUrl;
		downloadLink.download = `${chatbotName}-qr.png`;
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);
	};

	return (
		<>
			<div className="min-w-0 flex-1 p-2 onboarding-height overflow-hidden">
				<div className="relative h-full min-w-0 rounded-xl bg-white dark:bg-gray-950 overflow-hidden shadow-xs border dark:border-gray-800">
					<div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto p-8 scrollbar-hide">
						<div className=" min-w-0 shrink-0">
							<div className=" flex items-start justify-between">
								<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
									Share via a QR code{" "}
								</h3>
								<Button
									size="icon"
									variant="outline"
									className="text-gray-400 hidden sm:flex hover:text-gray-500 rounded-full"
									onClick={onClose}>
									<XIcon />
								</Button>
							</div>
							<p className="max-w-md text-pretty text-sm text-gray-600 dark:text-gray-400">
								Generate a QR code that customers can scan to chat
								with your agent.
							</p>
						</div>
						<div className="pt-5 pb-2">
							<div className="mb-2 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<QrIcon color="red" />
									<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
										Download QR code
									</p>
								</div>
								<div className="flex gap-2">
									<Button
										className="text-sm font-medium text-gray-600 dark:text-gray-100"
										variant="outline"
										onClick={downloadQRCode}
										size="sm">
										Download
									</Button>
								</div>
							</div>
							<p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
								Download this QR code and display it in your store,
								office etc
							</p>
						</div>

						<div className="flex flex-col items-center justify-center py-6 space-y-4">
							<div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
								{websiteUrl ? (
									<QRCodeCanvas
										id="qr-code"
										value={websiteUrl}
										size={250}
										level="H"
										marginSize={3}
										className="rounded-lg shadow-sm"
									/>
								) : (
									<div className="w-50 h-50 flex items-center justify-center">
										<p className="text-sm text-gray-500 dark:text-gray-400">
											Unable to generate QR code
										</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
