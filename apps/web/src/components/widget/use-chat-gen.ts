import { generateUUID } from "@/lib/utils";
import { useCallback, useState } from "react";

const getOrCreateChatId = (storageKey: string): string => {
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;
  const newId = generateUUID();
  localStorage.setItem(storageKey, newId);
  return newId;
};

export const useChatGeneration = (storageKey = "chatId") => {
  const [chatId, setChatId] = useState<string>(() => getOrCreateChatId(storageKey));

  const resetChatId = useCallback(() => {
    const newId = generateUUID();
    localStorage.setItem(storageKey, newId);
    setChatId(newId);
  }, [storageKey]);

  return { chatId, resetChatId };
};
