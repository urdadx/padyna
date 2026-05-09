import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe } from "@/assets/icons/globe-icon";

interface LinkSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (links: string[]) => void;
  defaultLinks?: string[];
}

const EMPTY_LINKS: string[] = [];

export function LinkSourceDialog({
  open,
  onOpenChange,
  onSave,
  defaultLinks: initialLinks = EMPTY_LINKS,
}: LinkSourceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <LinkSourceDialogContent
          key={`${initialLinks.join("|")}-${open ? "open" : "closed"}`}
          onOpenChange={onOpenChange}
          onSave={onSave}
          seedLinks={initialLinks}
        />
      ) : null}
    </Dialog>
  );
}

function LinkSourceDialogContent({
  seedLinks,
  onOpenChange,
  onSave,
}: {
  seedLinks: string[];
  onOpenChange: (open: boolean) => void;
  onSave: (links: string[]) => void;
}) {
  const initialLinksRef = React.useRef(seedLinks);
  const [links, setLinks] = React.useState<string[]>(() => initialLinksRef.current);
  const [newLink, setNewLink] = React.useState("");
  const linkItems = React.useMemo(() => {
    const seen = new Map<string, number>();
    return links.map((link, index) => {
      const occurrence = (seen.get(link) ?? 0) + 1;
      seen.set(link, occurrence);

      return { index, key: `${link}-${occurrence}`, link };
    });
  }, [links]);

  const addLink = () => {
    if (newLink && !links.includes(newLink)) {
      setLinks((currentLinks) => [...currentLinks, newLink]);
      setNewLink("");
    }
  };

  const removeLink = (index: number) => {
    setLinks((currentLinks) => currentLinks.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    addLink(); // Ensure the current input is added before saving
    onSave(links);
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLink();
    }
  };

  return (
      <DialogContent className="sm:max-w-xl w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Links</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Add URLs to your website, youtube videos etc to train your AI agent.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="url">
              URL
              <span className="text-muted-foreground text-xs">(Press Enter to add)</span>
            </Label>
            <div className="flex flex-col gap-2">
              <Input
                id="url"
                type="url"
                placeholder="https://padyna.com"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                onKeyDown={handleKeyPress}
              />
            </div>
          </div>

          {linkItems.length > 0 && (
            <div className="flex flex-col gap-2 max-h-50 overflow-y-auto pr-2">
              {linkItems.map(({ index, key, link }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Globe className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">{link}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeLink(index)}
                    className="h-8 w-8 text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button className="w-full" onClick={handleSave} disabled={links.length === 0}>
            Add Link
          </Button>
        </DialogFooter>
      </DialogContent>
  );
}
