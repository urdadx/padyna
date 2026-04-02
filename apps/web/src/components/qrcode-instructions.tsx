import { XIcon, Download, QrCodeIcon } from "lucide-react";
import { Button } from "./ui/button";
import { QrCodeIcon as QrIcon } from "@/assets/icons/qrcode-icon";
import { env } from "@padyna/env/web";
import { motion } from "motion/react";
import { QRCodeCanvas } from "qrcode.react";

interface Chatbot {
	embedToken: string | null;
	name: string;
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
		downloadLink.href = pngUrl;
		downloadLink.download = `${chatbot.name.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
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
									Download QR Code
								</h3>
								<Button
									size="icon"
									variant="outline"
									className="text-gray-400 hover:text-gray-500 rounded-full"
									onClick={onClose}>
									<XIcon />
								</Button>
							</div>
							<p className="max-w-md text-pretty text-sm text-gray-600 dark:text-gray-400">
								Generate a QR code that customers can scan to chat
								with your agent.
							</p>
						</div>

						<div className="flex flex-col items-center justify-center py-10">
							<div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 mb-6">
								{websiteUrl ? (
									<QRCodeCanvas
										id="qr-code"
										value={websiteUrl}
										size={200}
										level="H"
										marginSize={5}
										className="rounded-lg shadow-sm"
									/>
								) : (
									<div className="w-50 h-50 flex items-center justify-center">
										<QrCodeIcon className="w-12 h-12 text-gray-300" />
									</div>
								)}
							</div>

							<div className="w-full max-w-sm space-y-4">
								<div className="mt-auto border-gray-100 dark:border-gray-800">
									<div className="flex items-center gap-3">
										<div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
											<QrIcon color="red" />
										</div>
										<div>
											<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
												Scan to chat
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												Your customers can scan to
												open the chat interface
											</p>
										</div>
									</div>
								</div>

								<motion.div
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}>
									<Button
										className="w-full  flex items-center justify-center gap-2"
										onClick={downloadQRCode}
										disabled={!websiteUrl}>
										Download
									</Button>
								</motion.div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
