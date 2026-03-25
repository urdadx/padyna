const TypingDot = ({ delay }: { delay: string }) => (
  <div
    className="w-2 h-2 rounded-full animate-pulse bg-gray-100/80 dark:bg-dark-accent/60"
    style={{ animationDelay: delay }}
  />
);

const BotBubble = ({ lines }: { lines: string[] }) => (
  <div className="flex justify-start w-full">
    <div className="max-w-[85%] w-full px-4 py-3 rounded-2xl rounded-bl-lg bg-gray-100/30 dark:bg-dark-accent/30">
      {lines.map((width, i) => (
        <div
          key={i}
          className={`h-3 rounded-full bg-gray-100/80 dark:bg-dark-accent/50 ${i > 0 ? "mt-2" : ""}`}
          style={{ width }}
        />
      ))}
    </div>
  </div>
);

const UserBubble = ({ width }: { width: string }) => (
  <div className="flex justify-end w-full">
    <div className="max-w-[80%] w-full px-4 py-3 rounded-2xl rounded-br-lg bg-linear-to-br from-accent/10 to-accent/8">
      <div
        className="h-3 rounded-full bg-accent/30 dark:bg-accent-foreground/10"
        style={{ width }}
      />
    </div>
  </div>
);

export const ConversationsPlaceholder = () => {
  return (
    <div className="relative w-full max-w-xl pointer-events-none">
      {/* Card */}
      <div className=" flex flex-col overflow-hidden w-full rounded-lg dark:border-border! dashboard-border border">
        {/* Header */}
        <div className="flex justify-between items-center px-3 py-2 w-full border-b dark:border-border dashboard-border">
          <div className="flex items-center">
            <div className="overflow-hidden w-3 h-3 rounded-full bg-secondary">
              <img
                src="https://global.featurebase-attachments.com/a/shapes/5092_200_200.png"
                className="w-full h-full"
              />
            </div>
            <p className="text-[11px] mt-px leading-none font-semibold ml-1.5 text-foreground/90 dark:text-foreground/80">
              PADYNA
            </p>
          </div>
          <p className="text-[11px] leading-none font-semibold ml-1.5 text-foreground/90 dark:text-foreground/60">
            Support
          </p>
        </div>

        <div className="py-4 h-52 bg-background/10">
          <div className="w-full flex max-w-150 mx-auto px-6">
            <div className="flex flex-col flex-1 space-y-4 w-full">
              <BotBubble lines={["100%", "75%"]} />
              <UserBubble width="90%" />
              <BotBubble lines={["100%", "95%", "65%"]} />
              <UserBubble width="85%" />

              <div className="flex justify-start w-full">
                <div className="px-4 py-3 rounded-2xl rounded-bl-lg bg-gray-100/30 dark:bg-dark-accent/30">
                  <div className="flex space-x-1">
                    <TypingDot delay="0s" />
                    <TypingDot delay="0.2s" />
                    <TypingDot delay="0.4s" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -inset-x-8 bottom-0 h-32 bg-linear-to-b from-transparent to-white dark:to-[#161923]" />
      <div className="absolute -inset-x-8 -bottom-12 h-12 bg-white dark:bg-[#161923]" />
    </div>
  );
};
