import { useEffect, useMemo, useState } from "react";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { FileEmpty } from "@/assets/icons/file-icon";
import { FolderIconLinear, FolderOpenIconLinear } from "./folder-icon";
import Spinner from "./ui/spinner";

interface Item {
  name: string;
  children?: string[];
  type?: "folder" | "file";
  description?: string | null;
  selectable?: boolean;
}

interface FileTreeProps {
  items: Record<string, Item>;
  rootItemId: string;
  checkedItems?: string[];
  onCheckedItemsChange?: (checkedItems: string[]) => void;
  onFolderClick?: (itemId: string) => void;
  loadingItemIds?: string[];
  emptyMessage?: string;
}

const indent = 18;
const EMPTY_IDS: string[] = [];

function isFolder(item: Item) {
  return item.type === "folder" || Boolean(item.children?.length);
}

function getSelectableItemIds(
  items: Record<string, Item>,
  itemId: string,
  visited = new Set<string>(),
): string[] {
  if (visited.has(itemId)) {
    return [];
  }

  visited.add(itemId);

  const item = items[itemId];
  if (!item) {
    return [];
  }

  if (!isFolder(item)) {
    return [itemId];
  }

  return [
    ...(item.selectable ? [itemId] : []),
    ...(item.children ?? []).flatMap((childId) => getSelectableItemIds(items, childId, visited)),
  ];
}

function getCheckedState(items: Record<string, Item>, itemId: string, checkedItems: Set<string>) {
  const item = items[itemId];
  if (!item) {
    return "unchecked";
  }

  if (isFolder(item)) {
    const descendantFileIds = getSelectableItemIds(items, itemId);
    if (descendantFileIds.length === 0) {
      return "unchecked";
    }

    const checkedCount = descendantFileIds.filter((id) => checkedItems.has(id)).length;
    return checkedCount === descendantFileIds.length
      ? "checked"
      : checkedCount > 0
        ? "indeterminate"
        : "unchecked";
  }

  return checkedItems.has(itemId) ? "checked" : "unchecked";
}

function getVisibleItems(
  items: Record<string, Item>,
  rootItemId: string,
  expandedItems: Set<string>,
) {
  const visibleItems: Array<{ id: string; depth: number }> = [];
  const visited = new Set<string>();

  const visitChildren = (parentId: string, depth: number) => {
    if (visited.has(parentId)) {
      return;
    }

    visited.add(parentId);

    const parent = items[parentId];
    for (const childId of parent?.children ?? []) {
      const child = items[childId];
      if (!child) {
        continue;
      }

      visibleItems.push({ depth, id: childId });

      if (isFolder(child) && expandedItems.has(childId)) {
        visitChildren(childId, depth + 1);
      }
    }
  };

  visitChildren(rootItemId, 0);

  return visibleItems;
}

export function FileTree({
  items,
  rootItemId,
  checkedItems = EMPTY_IDS,
  onCheckedItemsChange,
  onFolderClick,
  loadingItemIds = EMPTY_IDS,
  emptyMessage = "No files found.",
}: FileTreeProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set([rootItemId]));
  const checkedItemSet = useMemo(() => new Set(checkedItems), [checkedItems]);
  const loadingItemSet = useMemo(() => new Set(loadingItemIds), [loadingItemIds]);

  useEffect(() => {
    setExpandedItems((current) => {
      const next = new Set([...current].filter((itemId) => itemId === rootItemId || items[itemId]));
      next.add(rootItemId);
      return next;
    });
  }, [items, rootItemId]);

  const visibleItems = useMemo(
    () => getVisibleItems(items, rootItemId, expandedItems),
    [expandedItems, items, rootItemId],
  );

  const handleCheckedChange = (itemId: string, checked: boolean) => {
    const item = items[itemId];
    if (!item) {
      return;
    }

    const affectedItems = isFolder(item) ? getSelectableItemIds(items, itemId) : [itemId];
    if (affectedItems.length === 0) {
      return;
    }

    const next = new Set(checkedItems);
    for (const affectedItemId of affectedItems) {
      if (checked) {
        next.add(affectedItemId);
      } else {
        next.delete(affectedItemId);
      }
    }

    onCheckedItemsChange?.([...next]);
  };

  const handleFolderClick = (itemId: string) => {
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
    onFolderClick?.(itemId);
  };

  if (visibleItems.length === 0) {
    return (
      <div className="flex min-h-50 items-center justify-center rounded-lg p-3 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-0.5">
      {visibleItems.map(({ id, depth }) => {
        const item = items[id];
        const itemIsFolder = isFolder(item);
        const itemIsExpanded = expandedItems.has(id);
        const checkedState = getCheckedState(items, id, checkedItemSet);
        const hasSelectableFiles = itemIsFolder ? getSelectableItemIds(items, id).length > 0 : true;

        return (
          <div
            className="group flex min-w-0 items-start gap-2 rounded-md px-1.5 py-1.5 text-sm transition-colors hover:bg-muted/70"
            key={id}
            style={{ paddingLeft: `${depth * indent + 6}px` }}
          >
            <Checkbox
              checked={checkedState === "checked"}
              className="mt-0.5"
              disabled={!hasSelectableFiles}
              indeterminate={checkedState === "indeterminate"}
              onCheckedChange={(checked) => handleCheckedChange(id, Boolean(checked))}
            />
            <button
              className={cn(
                "flex min-w-0 flex-1 items-start gap-1.5 text-left outline-none",
                itemIsFolder ? "cursor-pointer" : "cursor-default",
              )}
              onClick={() => {
                if (itemIsFolder) {
                  handleFolderClick(id);
                }
              }}
              type="button"
            >
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                {itemIsFolder ? (
                  loadingItemSet.has(id) ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon
                      className={cn(
                        "size-3.5 text-muted-foreground transition-transform",
                        itemIsExpanded && "rotate-90",
                      )}
                    />
                  )
                ) : null}
              </span>
              <span className="mt-0.5 shrink-0">
                {itemIsFolder ? (
                  itemIsExpanded ? (
                    <FolderOpenIconLinear className="size-4 text-muted-foreground" />
                  ) : (
                    <FolderIconLinear className="size-4 text-muted-foreground" />
                  )
                ) : (
                  <FileEmpty className="size-4 text-muted-foreground" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium leading-5">{item.name}</span>
                {item.description && (
                  <span className="block truncate text-muted-foreground text-xs leading-4">
                    {item.description}
                  </span>
                )}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
