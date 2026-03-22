import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import Spinner from "../ui/spinner";
import { BugLinear } from "@/assets/icons/bug-icon";
import api from "../../lib/api";
import { queryClient, trpc } from "@/utils/trpc";

interface CrawlResult {
  crawlId: string;
  url: string;
  status: "active" | "completed" | "failed" | "cancelled";
  totalPages: number;
  completedPages: number;
  processed?: {
    crawlId: string;
    datasourceIds: string[];
    status: "success" | "failed";
    totalChunks: number;
    message?: string;
  };
}

interface CrawlWebsiteProps {
  onSuccess?: () => void;
  onStarted?: () => void;
}

export const CrawlWebsite = ({ onSuccess, onStarted }: CrawlWebsiteProps) => {
  const [urlInput, setUrlInput] = useState("");
  const [crawlStatus, setCrawlStatus] = useState<CrawlResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const isMountedRef = useRef(true);
  const activeCrawlIdRef = useRef<string | null>(null);
  const CRAWL_TOAST_ID = "crawl-status";

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const startCrawl = useMutation({
    mutationFn: async (url: string) => {
      const response = await api.post("/api/ingestion/crawl", { url });
      return response.data as CrawlResult;
    },
  });

  const cancelCrawl = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/ingestion/crawl/${id}`);
      return response.data;
    },
  });

  const pollCrawlStatus = async (id: string) => {
    activeCrawlIdRef.current = id;
    while (activeCrawlIdRef.current === id) {
      const response = await api.get(`/api/ingestion/crawl/${id}`);
      const status = response.data as CrawlResult;

      if (isMountedRef.current) {
        setCrawlStatus(status);
      }

      if (status.status === "completed") {
        if (status.processed?.status === "success") {
          toast.success("Crawl completed!", {
            id: CRAWL_TOAST_ID,
          });
          toast.dismiss(CRAWL_TOAST_ID);
          queryClient.invalidateQueries({
            queryKey: trpc.datasource.getAll.queryOptions().queryKey,
          });
          queryClient.invalidateQueries({
            queryKey: trpc.datasource.getSourceCounts.queryOptions().queryKey,
          });
          if (isMountedRef.current) {
            setUrlInput("");
          }
          onSuccess?.();
        } else {
          toast.error("Crawl failed", {
            id: CRAWL_TOAST_ID,
          });
          toast.dismiss(CRAWL_TOAST_ID);
        }

        break;
      }

      if (status.status === "failed" || status.status === "cancelled") {
        toast.error("Crawl failed", {
          id: CRAWL_TOAST_ID,
        });
        toast.dismiss(CRAWL_TOAST_ID);
        break;
      }

      toast.loading(`Extracting content... (${status.completedPages}/${status.totalPages})`, {
        id: CRAWL_TOAST_ID,
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: "Cancel",
          onClick: () => {
            cancelCrawl.mutate(id);
            activeCrawlIdRef.current = null;
            toast.dismiss(CRAWL_TOAST_ID);
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    if (isMountedRef.current && activeCrawlIdRef.current === id) {
      setIsPolling(false);
      setCrawlStatus(null);
      activeCrawlIdRef.current = null;
    } else if (isMountedRef.current && activeCrawlIdRef.current === null) {
      setIsPolling(false);
      setCrawlStatus(null);
    }
  };

  const handleStartCrawl = async () => {
    if (!urlInput.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    const rawUrl = urlInput.trim();
    const fullUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

    try {
      toast.loading("Crawling in progress. This may take a few minutes", {
        duration: Number.POSITIVE_INFINITY,
        id: CRAWL_TOAST_ID,
      });
      const data = await startCrawl.mutateAsync(fullUrl);
      setIsPolling(true);
      onStarted?.();
      void pollCrawlStatus(data.crawlId);
    } catch {
      toast.error("Failed to start crawl", {
        id: CRAWL_TOAST_ID,
      });
      toast.dismiss(CRAWL_TOAST_ID);
      if (isMountedRef.current) {
        setIsPolling(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-3">
      <p className="text-sm text-muted-foreground">
        Crawl and extract content from an entire website
      </p>
      <div className="w-full flex justify-between items-center gap-2">
        <div className="flex rounded-md shadow-xs flex-1">
          <span className="border-input bg-gray-50 text-gray-500 inline-flex items-center rounded-s-md border px-3 text-sm">
            https://
          </span>
          <Input
            className="w-full -ms-px rounded-s-none shadow-none"
            placeholder="mywebsite.com"
            type="text"
            name="slug"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isPolling) handleStartCrawl();
            }}
            disabled={!!startCrawl.isPending || !!isPolling}
          />
        </div>
      </div>

      <motion.div className="w-full mt-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          className="w-full"
          onClick={handleStartCrawl}
          disabled={startCrawl.isPending || isPolling}
        >
          {startCrawl.isPending ? (
            <>
              <Spinner color="white" size={16} />
              Starting crawl...
            </>
          ) : isPolling ? (
            <>
              <Spinner color="white" size={16} />
              Checking status ({crawlStatus?.completedPages}/{crawlStatus?.totalPages})
            </>
          ) : (
            <>
              <BugLinear color="white" />
              Start crawling
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
};
