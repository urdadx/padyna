import { generateUUID } from "@/lib/utils";
import { useCallback, useState } from "react";

const getOrCreateChatId = (): string => {
  const existing = localStorage.getItem("chatId");
  if (existing) return existing;
  const newId = generateUUID();
  localStorage.setItem("chatId", newId);
  return newId;
};

export const useChatGeneration = () => {
  const [chatId, setChatId] = useState<string>(getOrCreateChatId);

  const resetChatId = useCallback(() => {
    const newId = generateUUID();
    localStorage.setItem("chatId", newId);
    setChatId(newId);
  }, []);

  return { chatId, resetChatId };
};
