"use client";

import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

export function WidgetMessage({
  avatar,
  content,
  animate = false,
  children,
  isUser = false,
  primaryColor,
}: PropsWithChildren<{
  avatar?: string;
  content?: string;
  animate?: boolean;
  isUser?: boolean;
  primaryColor?: string;
}>) {
  return (
    <div
      className={cn(
        "flex w-full origin-top-left items-start gap-3",
        isUser && "flex-row-reverse items-end",
        animate && "animate-scale-in-fade",
      )}
    >
      {avatar && (
        <img
          src={avatar}
          alt="avatar"
          className={cn("size-8 shrink-0 rounded-full", isUser && "mb-1")}
          draggable={false}
        />
      )}

      <div className={cn("max-w-[85%] min-w-0 py-1", isUser && "flex flex-col items-end self-end")}>
        {content && (
          <p
            className={cn(
              "w-fit rounded-2xl rounded-br px-3 py-2 text-sm",
              isUser ? "text-white" : "bg-muted text-neutral-800",
            )}
            style={
              isUser && primaryColor
                ? { backgroundColor: primaryColor }
                : isUser
                  ? { backgroundColor: "#000" }
                  : undefined
            }
          >
            {content}
          </p>
        )}
        {children && (
          <div
            className={cn(
              "rounded-2xl rounded-br px-3 py-2 text-sm min-w-0 max-w-full overflow-hidden overflow-wrap-anywhere",
              isUser ? "text-white" : "bg-muted/40 text-neutral-800",
            )}
            style={
              isUser && primaryColor
                ? { backgroundColor: primaryColor }
                : isUser
                  ? { backgroundColor: "#000" }
                  : undefined
            }
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
