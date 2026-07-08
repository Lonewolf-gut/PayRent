"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { conversationTitle } from "@/lib/messaging/display";
import type { ConversationSummary } from "@/lib/messaging/types";
import { cn } from "@/lib/utils";
import { ConversationList } from "./messaging-shared";

const TABS = ["Focused", "Other"] as const;
type MessagingTab = (typeof TABS)[number];

export function MessagingListPanel({
  conversations,
  activeId,
  currentUserId,
  onSelect,
  compact = false,
  className,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  currentUserId: string;
  onSelect: (id: string) => void;
  compact?: boolean;
  className?: string;
}) {
  const [tab, setTab] = useState<MessagingTab>("Focused");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = conversations;
    if (tab === "Focused") {
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
      list = list.filter(
        (conv) =>
          conv.unreadCount > 0 || new Date(conv.updatedAt).getTime() >= cutoff
      );
    } else {
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
      list = list.filter(
        (conv) =>
          conv.unreadCount === 0 && new Date(conv.updatedAt).getTime() < cutoff
      );
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
  }, [conversations, currentUserId, search, tab]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-card", className)}>
      <div className={cn("shrink-0 border-b", compact ? "px-3 py-3" : "px-4 py-4")}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages"
            className={cn(
              "rounded-full border-muted bg-muted/50 pl-9 pr-10",
              compact ? "h-9 text-sm" : "h-10"
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label="Filter messages"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex gap-6 border-b">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "pb-2 text-sm font-semibold transition-colors",
                tab === item
                  ? "border-b-2 border-emerald-700 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ConversationList
          conversations={filtered}
          activeId={activeId}
          currentUserId={currentUserId}
          onSelect={onSelect}
          compact={compact}
          variant="linkedin"
        />
      </div>
    </div>
  );
}
