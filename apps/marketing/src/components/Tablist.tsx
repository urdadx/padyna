import { AnalyticsIcon, HammerIcon, MousePointerIcon, ZapIcon } from "./icons";
import { Tabs } from "./Tabs";

export function Tablist() {
  const tabs = [
    {
      id: "playground",
      label: "Playground",
      icon: <HammerIcon />,
    },
    {
      id: "actions",
      label: "Agent Actions",
      icon: <ZapIcon />,
    },
    {
      id: "analytics",
      label: "Analytics & Insights",
      icon: <AnalyticsIcon />,
    },
    {
      id: "activity",
      label: "Activity",
      icon: <MousePointerIcon />,
    },
  ];

  return (
    <Tabs tabs={tabs}>
      <div key="playground">
        <div className="flex min-h-75 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-stone-600">
          Playground Content (React)
        </div>
      </div>
      <div key="actions">
        <div className="flex min-h-75 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-stone-600">
          Agent Actions Content (React)
        </div>
      </div>
      <div key="analytics">
        <div className="flex min-h-75 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-stone-600">
          Analytics Content (React)
        </div>
      </div>
      <div key="activity">
        <div className="flex min-h-75 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-stone-600">
          Activity Content (React)
        </div>
      </div>
    </Tabs>
  );
}
