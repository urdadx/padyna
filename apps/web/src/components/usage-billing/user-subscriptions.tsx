import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreHorizontal } from "lucide-react";
import { CuteIconWrapper } from "../cute-icon-wrapper";
import { WalletLinear } from "@/assets/icons/wallet";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { Link, useRouteContext } from "@tanstack/react-router";
import { planNameMap } from "@/lib/plan-slugs";
import { useState } from "react";
import { CancelSubscription } from "./cancel-subscription-dialog";
import { EndTrial } from "./end-trial-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const PAGE_SIZE = 5;

export function UserSubscriptions() {
	const [page, setPage] = useState(0);
	const { session } = useRouteContext({ from: "/(admin)" });
	const isAdmin = session?.user.role === "admin";

	const { data: subscriptions = [] } = useSuspenseQuery(
		trpc.subscription.getOrganizationSubscriptions.queryOptions(),
	);

	const [cancelId, setCancelId] = useState<string | null>(null);
	const [endTrialId, setEndTrialId] = useState<string | null>(null);

	const totalPages = Math.ceil(subscriptions.length / PAGE_SIZE);
	const paginatedSubscriptions = subscriptions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
		<>
			<div className="rounded-2xl border bg-card text-card-foreground">
				<div className="p-3 px-4 sm:px-6">
					<h3 className="text-xl font-semibold text-foreground">
						Subscriptions
					</h3>
					{subscriptions.length === 0 ? (
						<p className="text-sm text-muted-foreground mt-2">
							No subscriptions yet.
						</p>
					) : (
						<div className="space-y-0 relative">
							{paginatedSubscriptions.map((sub, index) => (
								<div
									key={sub.id}
									className={`flex flex-col gap-3 py-3 sm:flex-row sm:items-center ${
										index !==
										paginatedSubscriptions.length - 1
											? "border-b border-border/50"
											: ""
									}`}>
									<div className="flex w-full max-w-48 truncate items-center gap-2 text-sm text-muted-foreground">
										<CuteIconWrapper
											color="green"
											icon={WalletLinear}
										/>
										<span>
											{planNameMap[
												sub.productId ?? ""
											] ??
												((
													sub.metadata as Record<
														string,
														unknown
													>
												)?.planName as string) ??
												"Plan"}
										</span>
									</div>
									<div className="flex-1" />
									<div className="flex items-center gap-2 text-sm capitalize text-muted-foreground w-28 justify-center">
										<div
											className={cn(
												"rounded-full w-2 h-2 shrink-0",
												sub.status === "active"
													? "bg-green-500"
													: sub.status ===
														  "trialing"
														? "bg-blue-800"
														: sub.status ===
															  "canceled"
															? "bg-red-800"
															: "bg-green-800",
											)}
										/>
										<span className="w-16">
											{sub.status}
										</span>
									</div>
									<div className="flex-1" />
									<div className="flex items-center gap-4 sm:gap-10">
										<div className="text-sm text-foreground w-32">
											Ends{" "}
											{formatDate(sub.currentPeriodEnd)}
										</div>
										<div className="text-sm text-foreground w-16">
											{formatCurrency(sub.amount / 100)}
										</div>
										<Popover>
											<PopoverTrigger>
												{!isAdmin ? (
													<Tooltip>
														<TooltipTrigger>
															<Button
																variant="outline"
																size="icon"
																disabled={
																	!isAdmin
																}
																className="rounded-lg shrink-0">
																<MoreHorizontal className="w-4 h-4" />
															</Button>
														</TooltipTrigger>
														<TooltipContent>
															<p>
																Only
																admins
																can
																manage
																subscriptions.
															</p>
														</TooltipContent>
													</Tooltip>
												) : (
													<Button
														variant="outline"
														size="icon"
														disabled={
															!isAdmin
														}
														className="rounded-lg shrink-0">
														<MoreHorizontal className="w-4 h-4" />
													</Button>
												)}
											</PopoverTrigger>
											<PopoverContent
												className="w-40 p-1"
												align="end">
												<div className="flex flex-col">
													{sub.status ===
														"trialing" && (
														<Button
															variant="ghost"
															size="sm"
															disabled={
																!isAdmin
															}
															className="justify-start w-full gap-2 font-normal"
															onClick={() =>
																setEndTrialId(
																	sub.id,
																)
															}>
															End trial
														</Button>
													)}
													{(sub.status ===
														"active" ||
														sub.status ===
															"trialing") && (
														<Button
															variant="ghost"
															size="sm"
															disabled={
																!isAdmin
															}
															className="justify-start gap-2 font-normal text-destructive hover:text-destructive"
															onClick={() =>
																setCancelId(
																	sub.id,
																)
															}>
															Cancel
															subscription
														</Button>
													)}
												</div>
											</PopoverContent>
										</Popover>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
				<div className="border-t border-border bg-gray-50 p-3 px-4 sm:px-6 rounded-b-2xl flex items-center justify-between">
					<Link to="/onboarding/pricing">
						<Button size="sm">View other plans</Button>
					</Link>
					{totalPages > 1 && (
						<div className="flex items-center gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => setPage((p) => p - 1)}
								disabled={page === 0}>
								Previous
							</Button>
							<span className="text-sm text-muted-foreground">
								{page + 1} / {totalPages}
							</span>
							<Button
								size="sm"
								variant="outline"
								onClick={() => setPage((p) => p + 1)}
								disabled={page >= totalPages - 1}>
								Next
							</Button>
						</div>
					)}
				</div>
			</div>

			<CancelSubscription
				id={cancelId ?? ""}
				open={!!cancelId}
				onOpenChange={(open) => !open && setCancelId(null)}
			/>
			<EndTrial
				id={endTrialId ?? ""}
				open={!!endTrialId}
				onOpenChange={(open) => !open && setEndTrialId(null)}
			/>
		</>
	);
}
