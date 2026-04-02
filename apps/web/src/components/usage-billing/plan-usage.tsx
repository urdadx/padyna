import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/ui/circular-progress";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogTrigger } from "../ui/dialog";
import { Drawer, DrawerTrigger } from "../ui/drawer";
import { AddOnsDialog } from "./add-ons-dialog";
import { formatFileSize } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { planNameMap } from "@/lib/plan-slugs";

const numberFormatter = new Intl.NumberFormat("en-US");

export function PlanUsage() {
	const isMobile = useIsMobile();

	const { data: orgLimits } = useSuspenseQuery(
		trpc.subscription.getOrganizationLimits.queryOptions(),
	);

	const { data: customerState } = useSuspenseQuery(
		trpc.subscription.getCustomerState.queryOptions(),
	);

	const { data: totalDatasourceSize = 0 } = useSuspenseQuery(
		trpc.datasource.getTotalSize.queryOptions(),
	);

	const activeSubscription = customerState?.activeSubscriptions?.[0];
	const planName = activeSubscription
		? (planNameMap[activeSubscription.productId ?? ""] ?? "No Plan")
		: null;

	const messageMeter = customerState?.activeMeters?.find(
		(meter) => (meter?.creditedUnits ?? 0) > 0,
	);
	const messageCreditsUsed = messageMeter?.consumedUnits ?? 0;
	const messageCreditsFromMeter = messageMeter?.creditedUnits ?? 0;

	const usageLimits = [
		{
			label: "Message credits",
			max: messageCreditsFromMeter || 2000,
			used: messageCreditsUsed,
			format: (n: number) => numberFormatter.format(n),
		},
		{
			label: "Data source size",
			max: orgLimits?.maxDataSourceSize ?? 50 * 1024 * 1024,
			used: totalDatasourceSize,
			format: formatFileSize,
		},
	];

	return (
		<div className=" bg-card text-card-foreground">
			<div className="grid gap-8 p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
				<div className="space-y-5">
					<div className="space-y-2">
						<h3 className="text-lg font-semibold tracking-tight text-foreground">
							{planName ? `${planName} usage` : "Plan usage"}
						</h3>
						<p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
							{planName
								? `You are currently on the ${planName} Plan. Your limits will reset at the end of the billing cycle.`
								: "No active subscription"}
						</p>
						{isMobile ? (
							<Drawer>
								<DrawerTrigger asChild>
									<Button className="w-fit px-4" size="sm">
										Increase limits
									</Button>
								</DrawerTrigger>
								<AddOnsDialog defaultValue="messages" isMobile />
							</Drawer>
						) : (
							<Dialog>
								<DialogTrigger>
									<Button className="w-fit px-4" size="sm">
										Increase limits
									</Button>
								</DialogTrigger>
								<AddOnsDialog
									defaultValue="messages"
									isMobile={false}
								/>
							</Dialog>
						)}
					</div>
				</div>

				<div className="space-y-3">
					<div className="divide-y ">
						{usageLimits.map((limit) => (
							<UsageLimitRow key={limit.label} {...limit} />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

type UsageLimitRowProps = {
	label: string;
	max: number;
	used: number;
	format?: (n: number) => string;
};

function UsageLimitRow({ label, max, used, format = numberFormatter.format }: UsageLimitRowProps) {
	const usagePercent = max > 0 ? (used / max) * 100 : 0;

	return (
		<div className="flex items-center justify-between gap-4 py-1.5">
			<div className="flex min-w-0 items-center gap-3">
				<CircularProgress
					aria-label={`${label} usage`}
					indicatorClassName="text-emerald-500"
					max={100}
					showValueLabel={false}
					size={35}
					strokeWidth={2.5}
					value={usagePercent}
				/>
				<span className="truncate text-sm text-foreground">{label}</span>
			</div>
			<p className="text-sm text-muted-foreground">
				{format(used)} / {format(max)}
			</p>
		</div>
	);
}
