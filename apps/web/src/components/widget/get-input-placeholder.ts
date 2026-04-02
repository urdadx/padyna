type PlaceholderOptions = {
  isClosed: boolean;
  isEscalated: boolean;
  hasLiveChatToken: boolean;
  canSendMessages: boolean;
};

export function getInputPlaceholder({
  isClosed,
  isEscalated,
  hasLiveChatToken,
  canSendMessages,
}: PlaceholderOptions): string {
  if (isClosed) return "This conversation has ended.";
  if (!isEscalated) return "Ask me anything...";
  if (!hasLiveChatToken) return "Connecting live support...";
  if (!canSendMessages) return "Waiting for human agent to join...";
  return "Type your message...";
}
