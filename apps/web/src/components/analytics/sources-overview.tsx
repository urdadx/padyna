import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight } from "lucide-react";
import { FileLinear } from "@/assets/icons/file-icon";
import { ChatLinear } from "@/assets/icons/chat-icon";
import { TextLinear } from "@/assets/icons/text-icon";
import { GlobeLinear } from "@/assets/icons/globe-icon";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import BarList from "./bar-list";

interface SourcesOverviewProps {
  sourcesData?: {
    id: string;
    sourceName?: string | null;
    url?: string | null;
    question?: string | null;
    sourceType: "file" | "link" | "qa" | "text";
    timesReferenced: number;
  }[];
}

export function SourcesOverview({ sourcesData }: SourcesOverviewProps) {
  const navigate = useNavigate();

  const mapSources = useMemo(() => {
    return (sourcesData ?? []).map((source) => {
      let icon = <FileLinear color="black" className="w-4 h-4" />;
      if (source.sourceType === "link") icon = <GlobeLinear color="black" className="w-4 h-4" />;
      if (source.sourceType === "qa") icon = <ChatLinear color="black" className="w-4 h-4" />;
      if (source.sourceType === "text") icon = <TextLinear color="black" className="w-4 h-4" />;

      return {
        icon,
        title: source.sourceName || source.question || source.url || "Untitled Source",
        value: source.timesReferenced,
        href: source.url || "",
        linkId: source.id,
      };
    });
  }, [sourcesData]);

  const topSources = mapSources.slice(0, 5);
  const maxSourceCount = Math.max(...mapSources.map((s) => s.value), 0);
  const hasData = mapSources.length > 0;

  return (
    <div className="h-87.5 w-full z-0 rounded-xl border bg-white flex flex-col overflow-hidden">
      <Tabs defaultValue="sources" className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 pt-3 shrink-0">
          <TabsList className="h-auto pb-0 gap-2 rounded-none border-border bg-transparent px-0 text-foreground">
            <TabsTrigger
              value="sources"
              className="text-muted-foreground hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Top data sources
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="sources" className="h-full m-0 p-0">
            <div className="h-full flex flex-col">
              {!hasData ? (
                <div className="flex flex-col items-center justify-center h-full min-h-48 text-center">
                  <p className="text-muted-foreground text-sm">No data available yet</p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 px-4 overflow-hidden">
                  <BarList
                    tab="Data Sources"
                    unit="usages"
                    data={topSources}
                    barBackground="bg-blue-200/40"
                    hoverBackground="hover:bg-blue-50"
                    maxValue={maxSourceCount}
                    limit={5}
                  />
                </div>
              )}
              {hasData && mapSources.length > 5 && (
                <div className="shrink-0 px-4 py-3 ">
                  <div className="flex items-center justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate({
                          to: "/analytics",
                        })
                      }
                      className="text-muted-foreground"
                    >
                      View all
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
