import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreHorizontal } from "lucide-react";
import { CuteIconWrapper } from "../cute-icon-wrapper";
import { WalletLinear } from "@/assets/icons/wallet";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { Link } from "@tanstack/react-router";

export function UserSubscriptions() {
	const { data: subscriptions = [] } = useSuspenseQuery(
		trpc.subscription.getOrganizationSubscriptions.queryOptions(),
	);

	const formatDate = (date: Date | string | null | undefined) => {
		if (!date) return "N/A";
		const options: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "short",
			day: "numeric",
		};
		return new Date(date).toLocaleDateString(undefined, options);
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	return (
		<div className="rounded-2xl border bg-card text-card-foreground">
			<div className="p-3 px-4 sm:px-6">
				<h3 className="text-xl font-semibold text-foreground">Subscriptions</h3>
				{subscriptions.length === 0 ? (
					<p className="text-sm text-muted-foreground mt-2">
						No subscriptions yet.
					</p>
				) : (
					<div className="space-y-0 relative">
						{subscriptions.map((sub, index) => (
							<div
								key={sub.id}
								className={`flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
									index !== subscriptions.length - 1
										? "border-b border-border/50"
										: ""
								}`}>
								<div className="text-sm flex items-center gap-2 text-muted-foreground">
									<CuteIconWrapper
										color="green"
										icon={WalletLinear}
									/>
									<span>
										{((
											sub.metadata as Record<
												string,
												unknown
											>
										)?.planName as string) || "Plan"}
									</span>
								</div>
								<div className="flex items-center gap-2 text-sm capitalize">
									<div
										className={cn(
											"rounded-full w-2 h-2",
											sub.status === "active"
												? "bg-green-500"
												: sub.status === "trialing"
													? "bg-blue-500"
													: sub.status ===
														  "canceled"
														? "bg-red-500"
														: "bg-green-500",
										)}
									/>
									{sub.status}
								</div>
								<div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:gap-8">
									<div className="text-sm text-foreground">
										Ends {formatDate(sub.currentPeriodEnd)}
									</div>
									<div className="text-sm text-foreground w-16 text-right">
										{formatCurrency(sub.amount / 100)}
									</div>
									<Popover>
										<PopoverTrigger>
											<Button
												variant="outline"
												size="icon"
												className="rounded-lg">
												<MoreHorizontal className="w-4 h-4" />
											</Button>
										</PopoverTrigger>
										<PopoverContent
											className="w-40 p-1"
											align="end">
											<div className="flex flex-col">
												<Button
													variant="ghost"
													size="sm"
													className="justify-start gap-2 font-normal">
													Upgrade
												</Button>
												<Button
													variant="ghost"
													size="sm"
													className="justify-start gap-2 font-normal text-destructive hover:text-destructive">
													Cancel
												</Button>
											</div>
										</PopoverContent>
									</Popover>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
			<div className="border-t border-border bg-gray-50 p-3 px-4 sm:px-6 rounded-b-2xl">
				<Link to="/onboarding/pricing">
					<Button size="sm">View other plans</Button>
				</Link>
			</div>
		</div>
	);
}
