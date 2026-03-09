import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/ui/circular-progress";

const numberFormatter = new Intl.NumberFormat("en-US");

const usageLimits = [
	{
		label: "Message credits",
		maxTokens: 3000,
		usedTokens: 1000,
	},

	{
		label: "Data source size limit",
		maxTokens: 100,
		usedTokens: 25,
	},
];

export function PlanUsage() {
	return (
		<div className=" bg-card text-card-foreground">
			<div className="grid gap-8 p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
				<div className="space-y-5">
					<div className="space-y-2">
						<h3 className="text-lg font-semibold tracking-tight text-foreground">
							Growth Plan usage
						</h3>
						<p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
							You are currently on the Growth Plan. Your limits will
							reset on the first day of each month.
						</p>
						<Button className="w-fit  px-4" size="sm">
							Increase limits
						</Button>
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
	maxTokens: number;
	usedTokens: number;
};

function UsageLimitRow({ label, maxTokens, usedTokens }: UsageLimitRowProps) {
	const usagePercent = maxTokens > 0 ? (usedTokens / maxTokens) * 100 : 0;

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
				{numberFormatter.format(usedTokens)} / {numberFormatter.format(maxTokens)}
			</p>
		</div>
	);
}
