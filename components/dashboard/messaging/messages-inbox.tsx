"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { conversationTitle } from "@/lib/messaging/display";
import { cn } from "@/lib/utils";
import { ChatThread, ConversationList, useMessaging } from "./messaging-shared";

const FILTERS = ["Focused", "Unread"] as const;
type InboxFilter = (typeof FILTERS)[number];

export function MessagesInbox({
  startRecipientId,
}: {
  startRecipientId?: string | null;
}) {
  const [filter, setFilter] = useState<InboxFilter>("Focused");
  const [search, setSearch] = useState("");
  const {
    currentUserId,
    conversations,
    messages,
    activeId,
    setActiveId,
    activeConversation,
    content,
    setContent,
    sendMutation,
    typers,
  } = useMessaging(startRecipientId);

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (filter === "Unread") {
      list = list.filter((conv) => conv.unreadCount > 0);
    }
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      list = list.filter((conv) => {
        const title = conversationTitle(conv.participants, currentUserId).toLowerCase();
        const preview = conv.lastMessage?.content.toLowerCase() ?? "";
        return title.includes(query) || preview.includes(query);
      });
    }
    return list;
  }, [conversations, currentUserId, filter, search]);

  const title = activeConversation
    ? conversationTitle(activeConversation.participants, currentUserId)
    : "Select a conversation";

  return (
    <div className="-mx-4 -mb-4 flex h-[calc(100dvh-7.5rem)] min-h-[520px] overflow-hidden border-t bg-card sm:-mx-6 sm:-mb-6 lg:mx-0 lg:mb-0 lg:h-[calc(100dvh-8.5rem)] lg:rounded-xl lg:border">
      <aside
        className={cn(
          "flex w-full flex-col border-r lg:w-[min(360px,38%)] lg:shrink-0",
          activeId ? "hidden lg:flex" : "flex"
        )}
      >
        <div className="shrink-0 border-b px-4 py-4">
          <h2 className="text-lg font-semibold">Messaging</h2>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search messages"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filter === item
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ConversationList
            conversations={filteredConversations}
            activeId={activeId}
            currentUserId={currentUserId}
            onSelect={setActiveId}
          />
        </div>
      </aside>

      <section
        className={cn(
          "min-w-0 flex-1 flex-col",
          activeId ? "flex" : "hidden lg:flex"
        )}
      >
        {activeId ? (
          <ChatThread
            messages={messages}
            currentUserId={currentUserId}
            title={title}
            content={content}
            onContentChange={setContent}
            onSend={() => sendMutation.mutate()}
            sending={sendMutation.isPending}
            typers={typers}
            heightClass="min-h-0 flex-1"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation to start chatting
          </div>
        )}
      </section>
    </div>
  );
}
