import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "../ui/input";
import { motion } from "motion/react";
import api from "../../lib/api";
import { queryClient, trpc } from "../../utils/trpc";
import Spinner from "../ui/spinner";
import { useEffect, useState } from "react";

interface QASource {
  id?: string;
  question: string;
  answer: string;
}

interface QASourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: QASource;
}

export function QASourceDialog({ open, onOpenChange, defaultValues }: QASourceDialogProps) {
  const [question, setQuestion] = useState(defaultValues?.question || "");
  const [answer, setAnswer] = useState(defaultValues?.answer || "");

  const isEdit = Boolean(defaultValues?.id);

  const { mutate: saveQa, isPending } = useMutation({
    mutationFn: async (data: { question: string; answer: string }) => {
      const url =
        isEdit && defaultValues?.id ? `/api/ingestion/qa/${defaultValues.id}` : "/api/ingestion/qa";
      const method = isEdit ? api.put : api.post;
      const response = await method(url, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Q&A updated" : "Q&A source added");
      queryClient.invalidateQueries({
        queryKey: trpc.datasource.getAll.queryOptions().queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: trpc.datasource.getSourceCounts.queryOptions().queryKey,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          (isEdit ? "Failed to update Q&A" : "Failed to add Q&A source"),
      );
    },
  });

  useEffect(() => {
    if (open) {
      setQuestion(defaultValues?.question || "");
      setAnswer(defaultValues?.answer || "");
    }
  }, [open, defaultValues]);

  const handleSave = () => {
    saveQa({ question, answer });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Q&A Source</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Add a question and its corresponding answer to train your AI.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder="Ex: How do I reset my password?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="answer">Answer</Label>
            <Textarea
              id="answer"
              placeholder="Enter the answer here..."
              className="min-h-20"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!question.trim() || !answer.trim() || isPending}
            >
              {isPending ? (
                <>
                  <Spinner className="text-white" />
                  Saving...
                </>
              ) : isEdit ? (
                "Update Q&A"
              ) : (
                "Add Q&A"
              )}
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
