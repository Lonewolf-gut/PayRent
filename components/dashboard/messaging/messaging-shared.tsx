"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { conversationTitle } from "@/lib/messaging/display";
import type { ChatMessage, ConversationSummary } from "@/lib/messaging/types";
import { toast } from "sonner";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function useMessaging(startRecipientId?: string | null) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const [activeId, setActiveId] = useState<string | null>(null);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!startRecipientId) return;
    let cancelled = false;

    (async () => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: startRecipientId,
          content: "Hello, I'd like to continue our conversation here.",
        }),
      });
      const json = await res.json();
      if (!cancelled && json.success) {
        const conversationId = json.data?.conversationId;
        if (conversationId) {
          setActiveId(conversationId);
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryClient, startRecipientId]);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/messages");
      const json = await res.json();
      return (json.data ?? []) as ConversationSummary[];
    },
    refetchInterval: 15000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeId],
    queryFn: async () => {
      if (!activeId) return [];
      const res = await fetch(`/api/messages/${activeId}`);
      const json = await res.json();
      return (json.data ?? []) as ChatMessage[];
    },
    enabled: !!activeId,
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeId || !content.trim()) return;
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, content }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to send message");
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages-unread-count"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  return {
    currentUserId,
    conversations,
    messages,
    activeId,
    setActiveId,
    activeConversation,
    content,
    setContent,
    sendMutation,
  };
}

export function ConversationList({
  conversations,
  activeId,
  currentUserId,
  onSelect,
  compact = false,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  currentUserId: string;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  if (!conversations.length) {
    return (
      <p className={`text-sm text-muted-foreground ${compact ? "p-4" : "px-4 pb-4"}`}>
        No messages yet
      </p>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conv) => {
        const title = conversationTitle(conv.participants, currentUserId);
        const other = conv.participants.find((p) => p.id !== currentUserId);
        const isActive = activeId === conv.id;

        return (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelect(conv.id)}
            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/70 ${
              isActive ? "border-l-2 border-emerald-600 bg-muted" : "border-l-2 border-transparent"
            }`}
          >
            <Avatar className="size-10 shrink-0">
              {other?.image ? <AvatarImage src={other.image} alt={title} /> : null}
              <AvatarFallback>{getInitials(other?.displayName ?? title)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{title}</p>
                {conv.lastMessage ? (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {format(new Date(conv.lastMessage.createdAt), "MMM d")}
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-muted-foreground">
                  {conv.lastMessage?.content ?? "No messages"}
                </p>
                {conv.unreadCount > 0 ? (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ChatThread({
  messages,
  currentUserId,
  title,
  content,
  onContentChange,
  onSend,
  sending,
  heightClass = "h-[min(60vh,520px)]",
  showHeader = true,
}: {
  messages: ChatMessage[];
  currentUserId: string;
  title: string;
  content: string;
  onContentChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  heightClass?: string;
  showHeader?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {showHeader ? (
        <div className="border-b px-4 py-3">
          <p className="font-medium">{title}</p>
        </div>
      ) : null}
      <div className={`flex-1 space-y-3 overflow-y-auto p-4 ${heightClass}`}>
        {messages.length ? (
          messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
              >
                {!isOwn ? (
                  <Avatar className="mt-1 size-8 shrink-0">
                    {message.sender.image ? (
                      <AvatarImage src={message.sender.image} alt={message.sender.displayName} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {getInitials(message.sender.displayName)}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
                <div
                  className={`max-w-[60%] w-fit rounded-2xl px-3 py-2 text-sm ${
                    isOwn
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {!isOwn ? (
                    <p className="mb-1 text-xs font-medium opacity-80">
                      {message.sender.displayName}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isOwn ? "text-emerald-100/80" : "text-muted-foreground"
                    }`}
                  >
                    {format(new Date(message.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
                {isOwn ? (
                  <Avatar className="mt-1 size-8 shrink-0">
                    {message.sender.image ? (
                      <AvatarImage src={message.sender.image} alt={message.sender.displayName} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {getInitials(message.sender.displayName)}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">Start the conversation</p>
        )}
      </div>
      <div className="flex gap-2 border-t p-3">
        <Input
          placeholder="Type a message..."
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && content.trim() && !sending) onSend();
          }}
        />
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={!content.trim() || sending}
          onClick={onSend}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
