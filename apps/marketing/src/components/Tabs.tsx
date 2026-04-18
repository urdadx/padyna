import { motion, AnimatePresence } from "motion/react";
import { Children, isValidElement, type ReactNode, useState } from "react";

function isFullBleedChild(child: ReactNode) {
  return (
    isValidElement<{ "data-full-bleed"?: boolean }>(child) &&
    Boolean(child.props["data-full-bleed"])
  );
}

type Tab = {
  id: string;
  label: string;
  icon?: ReactNode;
};

type TabsProps = {
  tabs: readonly Tab[];
  children: ReactNode[];
};

export function Tabs({ tabs, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState<number>(0);
  const childArray = Children.toArray(children);

  const toggleTab = (index: number) => {
    setActiveTab(index);
  };

  return (
    <div className="w-full border-t border-stone-200">
      <div className="hidden w-full md:flex" role="tablist">
        {tabs.map((tab, index) => {
          const isActive = activeTab === index;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(index)}
              role="tab"
              aria-controls={`${tab.id}-panel`}
              aria-selected={isActive}
              id={`${tab.id}-tab`}
              className={`group relative flex flex-1 cursor-pointer items-center justify-center gap-2 border-r border-b border-stone-200 px-6 py-4 transition-colors duration-200 last:border-r-0 ${
                isActive
                  ? "border-b-transparent bg-white"
                  : "bg-stone-50 hover:bg-stone-100/50"
              }`}
            >
              {tab.icon}
              <span
                className={`font-mono text-sm font-medium tracking-tight uppercase transition-colors ${
                  isActive ? "text-stone-900" : "text-stone-600"
                }`}
              >
                {tab.label}
              </span>

              {isActive && (
                <motion.div
                  className="bg-primary absolute bottom-0 left-0 h-0.5 w-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex w-full flex-col md:block">
        {tabs.map((tab, index) => {
          const isActive = activeTab === index;
          return (
            <div key={tab.id} className="w-full">
              <button
                type="button"
                onClick={() => toggleTab(index)}
                aria-controls={`${tab.id}-panel`}
                aria-expanded={isActive}
                id={`${tab.id}-tab-mobile`}
                className="flex w-full items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4 text-left md:hidden"
              >
                <div className="flex items-center gap-2">
                  {tab.icon}
                  <span className="font-mono text-sm font-medium tracking-tight text-stone-800 uppercase">
                    {tab.label}
                  </span>
                </div>
                <motion.svg
                  animate={{ rotate: isActive ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </motion.svg>
              </button>

              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.div
                    id={`${tab.id}-panel`}
                    role="tabpanel"
                    aria-labelledby={`${tab.id}-tab`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] },
                      opacity: { duration: 0.25, delay: 0.1 },
                    }}
                    className="overflow-hidden border-b border-stone-200 bg-white md:border-b-0"
                  >
                    <div
                      className={
                        isFullBleedChild(childArray[index]) ? "" : "p-0 md:p-8"
                      }
                    >
                      {childArray[index]}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
