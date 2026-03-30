export interface ChatConversation {
  id: string;
  organizationId: string;
  title: string;
  status: "opened" | "escalated" | "closed" | "assigned";
  isHighPriority: boolean;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  metadata?: Record<string, unknown>;
  chatbotId?: string;
  visibility: "public" | "private";
}
