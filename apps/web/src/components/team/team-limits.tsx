import { useSuspenseQueries } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/ui/circular-progress";
import { trpc } from "@/utils/trpc";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogTrigger } from "../ui/dialog";
import { Drawer, DrawerTrigger } from "../ui/drawer";
import { AddOnsDialog } from "../usage-billing/add-ons-dialog";

const numberFormatter = new Intl.NumberFormat("en-US");

export function TeamLimits() {
  const isMobile = useIsMobile();

  const [{ data: orgLimits }, { data: chatbotsCount = 0 }, { data: memberCount = 0 }] =
    useSuspenseQueries({
      queries: [
        trpc.subscription.getOrganizationLimits.queryOptions(),
        trpc.agentsettings.getChatbotsCount.queryOptions(),
        trpc.subscription.getMemberCount.queryOptions(),
      ],
    });

  const usageLimits = [
    {
      label: "AI agents limit",
      max: orgLimits?.maxChatbots ?? 1,
      used: chatbotsCount,
    },
    {
      label: "Team members limit",
      max: orgLimits?.maxMembers ?? 1,
      used: memberCount,
    },
  ];

  return (
    <div className=" bg-card text-card-foreground">
      <div className="grid gap-8 p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div className="space-y-5">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Team Limits</h3>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Understand your current team limits and usage. Upgrade your plan to increase
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
                <AddOnsDialog defaultValue="messages" isMobile={false} />
              </Dialog>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="divide-y ">
            {usageLimits.map((limit) => (
              <UsageLimitRow
                key={limit.label}
                max={limit.max}
                used={limit.used}
                label={limit.label}
              />
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
};

function UsageLimitRow({ label, max, used }: UsageLimitRowProps) {
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
        {numberFormatter.format(used)} / {numberFormatter.format(max)}
      </p>
    </div>
  );
}
