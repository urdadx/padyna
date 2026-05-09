import type { CSSProperties, PropsWithChildren } from "react";

const PLACEHOLDER_CARD_IDS = ["placeholder-1", "placeholder-2", "placeholder-3", "placeholder-4", "placeholder-5", "placeholder-6"];

export function NoConversationPlaceholder() {
  return (
    <div className="flex flex-col w-full max-w-md items-center justify-center gap-6 rounded-lg px-4 py-4">
      <div className="animate-fade-in h-36 w-full max-w-70 overflow-hidden px-4 mask-[linear-gradient(transparent,black_10%,black_90%,transparent)]">
        <div
          style={{ "--scroll": "-50%" } as CSSProperties}
          className="animate-infinite-scroll-y flex flex-col animation-duration-[10s]"
        >
			{PLACEHOLDER_CARD_IDS.map((cardId) => (
			  <Card key={cardId}>
              <CardContent />
            </Card>
          ))}
        </div>
      </div>
      <div className=" text-pretty text-center">
        <h2 className="mt-2 text-pretty text-muted-foreground text-lg font-semibold">
          No conversation selected
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a conversation from the left panel to view the details
        </p>
      </div>
    </div>
  );
}

function Card({ children }: PropsWithChildren) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-[0_4px_8px_0_#0000000D]">
      {children}
    </div>
  );
}

function CardContent() {
  return (
    <div className="flex flex-col w-full">
      <div className="h-4 w-20 bg-gray-100 rounded-md mb-2" />
      <div className="h-3 w-full bg-gray-200 rounded-md" />
    </div>
  );
}
