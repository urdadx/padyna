import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ScrapeWebsite } from "../datasource/scrape-website";
import { CrawlWebsite } from "../datasource/crawl-website";

interface WebSourceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebSourceDialog({ open, onOpenChange }: WebSourceProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Links</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Add website pages or YouTube videos to train your AI agent.
          </DialogDescription>
        </DialogHeader>
        <Tabs className="w-full" defaultValue="scrape">
          <TabsList className="w-fit max-w-full justify-start overflow-x-auto text-foreground h-auto gap-2 bg-gray-50 rounded-md p-2">
            <TabsTrigger value="scrape">Single URL</TabsTrigger>
            <TabsTrigger value="crawl">Crawl an entire website</TabsTrigger>
            <TabsTrigger value="youtube">YouTube</TabsTrigger>
          </TabsList>
          <TabsContent value="scrape">
            <ScrapeWebsite onSuccess={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="crawl">
            <CrawlWebsite onStarted={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="youtube">
            <ScrapeWebsite
              description="Enter a YouTube video URL to extract its content."
              placeholder="youtube.com/watch?v=..."
              onSuccess={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
