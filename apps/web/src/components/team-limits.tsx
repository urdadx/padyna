import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/ui/circular-progress";

const numberFormatter = new Intl.NumberFormat("en-US");

const usageLimits = [
  {
    label: "AI agents limit",
    maxLimit: 2,
    usedLimit: 1,
  },

  {
    label: "Team members limit",
    maxLimit: 4,
    usedLimit: 1,
  },
];

export function TeamLimits() {
  return (
    <div className=" bg-card text-card-foreground">
      <div className="grid gap-8 p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div className="space-y-5">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Team Limits</h3>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Understand your current team limits and usage. Upgrade your plan to increase
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
  maxLimit: number;
  usedLimit: number;
};

function UsageLimitRow({ label, maxLimit, usedLimit }: UsageLimitRowProps) {
  const usagePercent = maxLimit > 0 ? (usedLimit / maxLimit) * 100 : 0;

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
        {numberFormatter.format(usedLimit)} / {numberFormatter.format(maxLimit)}
      </p>
    </div>
  );
}
