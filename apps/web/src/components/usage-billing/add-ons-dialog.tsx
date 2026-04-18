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
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { env } from "@padyna/env/web";
import { ADDON_PRODUCT_IDS } from "@/lib/plan-slugs";

export const AddOnsDialog = ({
	defaultValue,
	isMobile = false,
}: {
	defaultValue: keyof typeof ADDON_PRODUCT_IDS;
	isMobile?: boolean;
	onOpenChange?: (value: boolean) => void;
}) => {
	const [selectedAddon, setSelectedAddon] = useState<keyof typeof ADDON_PRODUCT_IDS | null>(
		defaultValue,
	);
	const [isCheckingOut, setIsCheckingOut] = useState(false);
	const { session } = useRouteContext({ from: "/(admin)" });
	const isAdmin = session?.user.role === "admin";
	const navigate = useNavigate();

	const handleCheckout = async () => {
		if (!selectedAddon) {
			toast.error("No addon selected");
			return;
		}

		if (!session || !session.session.activeOrganization) {
			navigate({ to: "/login" });
			return;
		}

		const productId = ADDON_PRODUCT_IDS[selectedAddon];
		if (!productId) {
			toast.error("Invalid addon selected");
			return;
		}

		setIsCheckingOut(true);

		try {
			const metadata = JSON.stringify({
				referenceId: session.session.activeOrganization,
				addonType: selectedAddon,
			});

			const params = new URLSearchParams();
			params.append("products", productId);
			params.append("metadata", metadata);
			params.append("customerExternalId", session.user.id);
			params.append("customerEmail", session.user.email ?? "");
			params.append("customerName", session.user.name ?? "");

			const checkoutUrl = `${env.VITE_SERVER_URL}/api/checkout?${params.toString()}`;
			window.location.href = checkoutUrl;
		} catch (error) {
			console.error("Checkout error:", error);
			toast.error("An error occurred. Please try again.");
			setIsCheckingOut(false);
		}
	};

	const selectAddon = (addonId: keyof typeof ADDON_PRODUCT_IDS) => {
		if (selectedAddon === addonId) {
			setSelectedAddon(null);
			return;
		}
		setSelectedAddon(addonId);
	};

	const isSelected = (addonId: keyof typeof ADDON_PRODUCT_IDS) => selectedAddon === addonId;

	const checkoutButton = (
		<motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
			<Tooltip>
				<TooltipTrigger className="w-full">
					<Button
						className="w-full"
						disabled={!selectedAddon || isCheckingOut || !isAdmin}
						onClick={handleCheckout}>
						{isCheckingOut ? (
							<>
								<Spinner className="text-white" />
								Processing...
							</>
						) : (
							<>
								Proceed to checkout
								<ArrowRight className="w-5 h-5" />
							</>
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>
						{!isAdmin
							? "Only admins can purchase add-ons."
							: "Select an add-on to proceed to checkout."}
					</p>
				</TooltipContent>
			</Tooltip>
		</motion.div>
	);

	const addonsContent = (
		<>
			<Card
				className={cn(
					"py-4 rounded-md cursor-pointer transition-colors",
					isSelected("messages")
						? "ring-2 ring-primary bg-primary/10"
						: "hover:bg-gray-50",
				)}
				onClick={() => selectAddon("messages")}>
				<CardContent className="">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div
								className={cn(
									"w-12 h-10 rounded-lg flex items-center justify-center text-primary",
									isSelected("messages")
										? "bg-primary/15"
										: "bg-primary/10",
								)}>
								<SolarChatUnreadBoldDuotone
									color="currentColor"
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
						? "ring-2 ring-primary bg-primary/10"
						: "hover:bg-gray-50",
				)}
				onClick={() => selectAddon("chatbot")}>
				<CardContent className="">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div
								className={cn(
									"w-12 h-10 bprder rounded-lg flex items-center justify-center text-primary",
									isSelected("chatbot")
										? "bg-primary/15"
										: "bg-primary/10",
								)}>
								<RiRobot2Fill
									color="currentColor"
									className="w-6 h-6 "
								/>
							</div>
							<div>
								<h3 className="text-base font-sans text-gray-900">
									Extra AI agent
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
						? "ring-2 ring-primary bg-primary/10"
						: "hover:bg-gray-50",
				)}
				onClick={() => selectAddon("member")}>
				<CardContent className="">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div
								className={cn(
									"w-12 h-10 bprder rounded-lg flex items-center justify-center text-primary",
									isSelected("member")
										? "bg-primary/15"
										: "bg-primary/10",
								)}>
								<SolarUserRoundedBoldDuotone
									color="currentColor"
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
						? "ring-2 ring-primary bg-primary/10"
						: "hover:bg-gray-50",
				)}
				onClick={() => selectAddon("branding")}>
				<CardContent className="">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div
								className={cn(
									"w-12 h-10 bprder rounded-lg flex items-center justify-center text-primary",
									isSelected("branding")
										? "bg-primary/15"
										: "bg-primary/10",
								)}>
								<BoltIcon color="currentColor" className="w-6 h-6 " />
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
