import { SolarChatUnreadBoldDuotone } from "@/assets/icons/chat-unread-icon";
import { SolarUserRoundedBoldDuotone } from "@/assets/icons/user-icon";
import { cn } from "@/lib/utils";
import { RiRobot2Fill } from "@remixicon/react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { DialogContent, DialogTitle } from "../ui/dialog";
import { DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "../ui/drawer";
import Spinner from "../ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { BoltIcon } from "@/assets/icons/bolt-duotone";

export const AddOnsDialog = ({
	defaultValue,
	isMobile = false,
	onOpenChange,
}: {
	defaultValue: string;
	isMobile?: boolean;
	onOpenChange?: (value: boolean) => void;
}) => {
	const [selectedAddon, setSelectedAddon] = useState<string | null>(defaultValue);
	const [isCheckingOut, setIsCheckingOut] = useState(false);
	const isAdmin = true;

	const handleCheckout = async () => {
		if (!selectedAddon) {
			toast.error("No addon selected");
			return;
		}

		setIsCheckingOut(true);

		try {
			console.log("Mocking checkout for:", selectedAddon);
			await new Promise((resolve) => setTimeout(resolve, 1500));
			toast.success("Redirecting to checkout...");
		} catch (error) {
			console.log("Checkout error:", error);
			toast.error("An error occurred. Please try again.");
		} finally {
			setIsCheckingOut(false);
			if (onOpenChange) onOpenChange(false);
		}
	};

	const selectAddon = (addonId: string) => {
		setSelectedAddon((prev) => (prev === addonId ? null : addonId));
	};

	const isSelected = (addonId: string) => selectedAddon === addonId;

	const checkoutButton = (
		<Tooltip>
			<TooltipTrigger className="block w-full">
				<motion.div
					className="w-full"
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}>
					<Button
						className="w-full"
						onClick={handleCheckout}
						disabled={!selectedAddon || !isAdmin || isCheckingOut}>
						{isCheckingOut ? (
							<>
								<Spinner className="w-4 h-4 text-white" />
								Processing...
							</>
						) : (
							<>
								Proceed to checkout
								<ArrowRight className="w-5 h-5" />
							</>
						)}
					</Button>
				</motion.div>
			</TooltipTrigger>
			{!isAdmin && (
				<TooltipContent className="bg-white shadow-sm p-3" sideOffset={8}>
					<p className="text-black text-sm">
						Only admins can purchase add-ons. Please contact your admin
					</p>
				</TooltipContent>
			)}
		</Tooltip>
	);

	const addonsContent = (
		<>
			<Card
				className={cn(
					"py-4 rounded-md cursor-pointer transition-colors",
					isSelected("messages")
						? "ring-2 ring-purple-500 bg-purple-50"
						: "hover:bg-gray-50",
				)}
				onClick={() => selectAddon("messages")}>
				<CardContent className="">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div
								className={cn(
									"w-12 h-10 rounded-lg flex items-center justify-center",
									isSelected("messages")
										? "bg-purple-100"
										: "bg-purple-50",
								)}>
								<SolarChatUnreadBoldDuotone
									color="#8b5cf6"
									className="w-6 h-6 "
								/>
							</div>
							<div>
								<h3 className="text-base font-sans text-gray-900">
									Extra 1000 credits
								</h3>
							</div>
						</div>
						<div>
							<div className="text-xl font-bold text-gray-900">
								+$12
								<span className="text-base font-normal text-gray-500">
									/mo
								</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card
				className={cn(
					"py-4 rounded-md cursor-pointer transition-colors",
					isSelected("chatbot")
						? "ring-2 ring-purple-500 bg-purple-50"
						: "hover:bg-gray-50",
				)}
				onClick={() => selectAddon("chatbot")}>
				<CardContent className="">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div
								className={cn(
									"w-12 h-10 bprder rounded-lg flex items-center justify-center",
									isSelected("chatbot")
										? "bg-purple-100"
										: "bg-purple-50",
								)}>
								<RiRobot2Fill
									color="#a78bfa"
									className="w-6 h-6 "
								/>
							</div>
							<div>
								<h3 className="text-base font-sans text-gray-900">
									Extra AI chatbot
								</h3>
							</div>
						</div>
						<div>
							<div className="text-xl font-bold text-gray-900">
								+$7
								<span className="text-base font-normal text-gray-500">
									/mo
								</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card
				className={cn(
					"py-4 rounded-md cursor-pointer transition-colors",
					isSelected("member")
						? "ring-2 ring-purple-500 bg-purple-50"
						: "hover:bg-gray-50",
				)}
				onClick={() => selectAddon("member")}>
				<CardContent className="">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div
								className={cn(
									"w-12 h-10 bprder rounded-lg flex items-center justify-center",
									isSelected("member")
										? "bg-purple-100"
										: "bg-purple-50",
								)}>
								<SolarUserRoundedBoldDuotone
									color="#8b5cf6"
									className="w-6 h-6 "
								/>
							</div>
							<div>
								<h3 className="text-base font-sans text-gray-900">
									Extra team member
								</h3>
							</div>
						</div>
						<div>
							<div className="text-xl font-bold text-gray-900">
								+$5
								<span className="text-base font-normal text-gray-500">
									/mo
								</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card
				className={cn(
					" py-4 rounded-md cursor-pointer transition-colors",
					isSelected("branding")
						? "ring-2 ring-purple-500 bg-purple-50"
						: "hover:bg-gray-50",
				)}
				onClick={() => selectAddon("branding")}>
				<CardContent className="">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div
								className={cn(
									"w-12 h-10 bprder rounded-lg flex items-center justify-center",
									isSelected("branding")
										? "bg-purple-100"
										: "bg-purple-50",
								)}>
								<BoltIcon color="#8b5cf6" className="w-6 h-6 " />
							</div>
							<div>
								<h3 className="text-base font-sans text-gray-900">
									Remove Padyna branding
								</h3>
							</div>
						</div>
						<div>
							<div className="text-xl font-bold text-gray-900">
								+$29
								<span className="text-base font-normal text-gray-500">
									/mo
								</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</>
	);

	if (!isMobile) {
		return (
			<DialogContent className="w-full max-w-lg!">
				<div className="space-y-1 mb-0">
					<DialogTitle className="text-xl  font-semibold">Add-ons</DialogTitle>
					<p className="text-base text-gray-600">
						Unlock more features with add-ons
					</p>
				</div>
				<div className="space-y-4 w-full">{addonsContent}</div>
				<div className="">{checkoutButton}</div>
			</DialogContent>
		);
	}

	return (
		<DrawerContent>
			<DrawerHeader className="text-left">
				<DrawerTitle className="text-xl font-semibold">Add-ons</DrawerTitle>
				<p className="text-base text-gray-600">Unlock more features with add-ons</p>
			</DrawerHeader>
			<div className="px-4 space-y-4">{addonsContent}</div>
			<DrawerFooter className="">
				{checkoutButton}
				<DrawerClose asChild>
					<Button variant="outline">Cancel</Button>
				</DrawerClose>
			</DrawerFooter>
		</DrawerContent>
	);
};
