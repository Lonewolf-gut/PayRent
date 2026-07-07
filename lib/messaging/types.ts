export type MessageSender = {
  id: string;
  email: string;
  image: string | null;
  displayName: string;
};

export type ConversationSummary = {
  id: string;
  updatedAt: string;
  unreadCount: number;
  participants: MessageSender[];
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
};

export type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: MessageSender;
};
