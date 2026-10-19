import { Button } from "@/components/ui/button";
import { Input } from "../ui/input";
import { useState } from "react";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import Spinner from "../ui/spinner";
import { useRouteContext } from "@tanstack/react-router";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function UserBillingEmail() {
	const { data: orgLimits } = useSuspenseQuery(
		trpc.subscription.getOrganizationLimits.queryOptions(),
	);

	const { session } = useRouteContext({ from: "/(admin)" });
	const isAdmin = session?.user.role === "admin" || session?.user.role === "owner";

	const { data: customerState, refetch } = useSuspenseQuery(
		trpc.subscription.getCustomerState.queryOptions(),
	);

	const [email, setEmail] = useState(customerState?.email ?? "");

	const updateEmail = useMutation(
		trpc.subscription.updateBillingEmail.mutationOptions({
			onSuccess: () => refetch(),
			onError: (error) => {
				console.error("Failed to update billing email:", error);
			},
		}),
	);
	const isSaving = updateEmail.isPending;

	const handleSave = () => {
		if (!orgLimits?.externalCustomerId) return;
		updateEmail.mutate({ email });
	};

	if (!orgLimits?.externalCustomerId) {
		return (
			<div className="rounded-2xl border bg-card text-card-foreground">
				<div className="p-3 px-4 sm:px-6">
					<h3 className="text-xl font-semibold text-foreground">
						Billing email
					</h3>
					<div className="space-y-0 relative">
						<div className="flex flex-col gap-4 pt-1">
							<div className="text-sm flex items-center gap-2 text-muted-foreground">
								<span>No billing account found.</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border bg-card text-card-foreground">
			<div className="p-3 px-4 sm:px-6">
				<h3 className="text-xl font-semibold text-foreground">Billing email</h3>
				<div className="space-y-0 relative">
					<div className="flex flex-col gap-4 pt-1">
						<div className="text-sm flex items-center gap-2 text-muted-foreground">
							<span>
								Email address where you receive billing
								notifications.
							</span>
						</div>
						{!isAdmin ? (
							<Tooltip>
								<TooltipTrigger>
									<Input
										disabled={!isAdmin}
										type="email"
										className="h-8 w-full bg-gray-200 outline-2"
										value={email}
										onChange={(e) =>
											setEmail(e.target.value)
										}
										placeholder="billing@example.com"
									/>
								</TooltipTrigger>
								<TooltipContent>
									<p>
										Only admins can update the billing
										email.
									</p>
								</TooltipContent>
							</Tooltip>
						) : (
							<Input
								type="email"
								className="h-8 w-full bg-gray-200 outline-2"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="billing@example.com"
							/>
						)}
					</div>
				</div>
			</div>
			<div className="border-t border-border bg-gray-50 p-3 px-4 sm:px-6 rounded-b-2xl">
				<Button size="sm" onClick={handleSave} disabled={isSaving || !isAdmin}>
					{isSaving ? (
						<>
							<Spinner className="text-white" size={16} />
							Saving...
						</>
					) : (
						"Save changes"
					)}
				</Button>
			</div>
		</div>
	);
}
