import { BoltLinear } from "@/assets/icons/bolt-duotone";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { SolarBoxMinimalisticBoldDuotone } from "@/assets/icons/box-icon";
import { SolarChatRoundUnreadBoldDuotone } from "@/assets/icons/chat-doutone";
import { SolarClipboardBoldDuotone } from "@/assets/icons/clipboard-icon";
import { SolarMagniferBoldDuotone } from "@/assets/icons/glass-search-icon";
import { SolarHeadphonesRoundBoldDuotone } from "@/assets/icons/support-duotone";
import CalImage from "@/assets/cal.avif";
import CalendlyIcon from "@/assets/calendly.png";

export const ActionCard = () => {
	const getIconForToolName = (toolName: string) => {
		const iconMap: Record<string, React.ReactNode> = {
			collect_feedback: (
				<SolarChatRoundUnreadBoldDuotone
					className="w-6 h-6 sm:w-8 sm:h-8"
					color="#22c55e"
				/>
			),
			collect_leads: (
				<SolarMagniferBoldDuotone
					color="#ec1313"
					className="w-6 h-6 sm:w-8 sm:h-8 "
				/>
			),
			escalate_to_human: (
				<SolarHeadphonesRoundBoldDuotone className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
			),
			custom_form: (
				<SolarClipboardBoldDuotone
					color="#00ad69"
					className="w-6 h-6 sm:w-8 sm:h-8 "
				/>
			),
			custom_button: (
				<SolarBoxMinimalisticBoldDuotone
					color="#e500b9"
					className="w-6 h-6 sm:w-8 sm:h-8 "
				/>
			),
			calendly_booking: (
				<img src={CalendlyIcon} alt="Calendly" className="w-6 h-6 sm:w-8 sm:h-8" />
			),
			cal_booking: <img src={CalImage} alt="cal" className="w-6 h-6 sm:w-8 sm:h-8" />,
		};

		return (
			iconMap[toolName] || (
				<div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-400 rounded-full" />
			)
		);
	};

	return (
		<div className="bg-white rounded-lg p-4 border border-gray-200  w-full max-w-md mx-auto h-full">
			<div className="flex flex-col gap-2 h-full">
				<div className="flex justify-between items-center">
					<div className="flex items-center gap-2">
						<div
							className={cn(
								"w-10 h-10 rounded flex items-center justify-center text-white",
							)}>
							{getIconForToolName("calendly_booking")}
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Switch />
					</div>
				</div>
				<div className="flex items-center gap-2">
					<h3 className="font-medium font-sans text-sm sm:text-md">
						Handle appointment booking
					</h3>
				</div>
				<p className="text-gray-600 text-xs lowercase sm:text-sm grow">
					<BoltLinear className="inline w-4 h-4 mr-1" />
					calendly booking
				</p>
				<Button className="w-full text-gray-700" variant="outline">
					Customize
				</Button>
			</div>
		</div>
	);
};
