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
        <div
          data-full-bleed
          className="relative h-96 w-full overflow-hidden bg-stone-950 md:h-168"
        >
          <video
            autoPlay
            muted
            aria-hidden="true"
            tabIndex={-1}
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            src="https://assets.padyna.com/assets/playground_long.mp4"
          />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <div className="w-fit rounded-lg border border-white/15 bg-black/35 px-4 py-3 text-white backdrop-blur-sm">
              <p className="mt-1 text-sm text-white/90">
                Test and customize your AI agent effortlessly
              </p>
            </div>
          </div>
        </div>
      </div>
      <div key="actions">
        <div
          data-full-bleed
          className="relative h-96 w-full overflow-hidden bg-stone-950 md:h-168"
        >
          <video
            autoPlay
            muted
            aria-hidden="true"
            tabIndex={-1}
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            src="https://assets.padyna.com/assets/padyna_action.mp4"
          />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <div className="w-fit rounded-lg border border-white/15 bg-black/35 px-4 py-3 text-white backdrop-blur-sm">
              <p className="mt-1 text-sm text-white/90">
                Automate workflows directly inside the conversation.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div key="analytics">
        <div
          data-full-bleed
          className="relative h-96 w-full overflow-hidden bg-stone-950 md:h-168"
        >
          <video
            autoPlay
            muted
            aria-hidden="true"
            tabIndex={-1}
            loop
            playsInline
            preload="auto"
            className="absolute h-full w-full object-cover"
            src="https://assets.padyna.com/assets/padyna-analytics.mp4"
          />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <div className="w-fit rounded-lg border border-white/15 bg-black/35 px-4 py-3 text-white backdrop-blur-sm">
              <p className="mt-1 text-sm text-white/90">
                Track performance, uncover patterns, and understand every
                conversation.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div key="activity">
        <div
          data-full-bleed
          className="relative h-96 w-full overflow-hidden bg-stone-950 md:h-168"
        >
          <video
            autoPlay
            muted
            aria-hidden="true"
            tabIndex={-1}
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            src="https://assets.padyna.com/assets/padyna-activity.mp4"
          />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <div className="w-fit rounded-lg border border-white/15 bg-black/35 px-4 py-3 text-white backdrop-blur-sm">
              <p className="mt-1 text-sm text-white/90">
                Track and manage your agent conversations with your customers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Tabs>
  );
}
