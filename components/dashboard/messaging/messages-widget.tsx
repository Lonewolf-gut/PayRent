"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Edit,
  MoreHorizontal,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { conversationTitle } from "@/lib/messaging/display";
import { getMessagesPath } from "@/lib/nav/dashboard-quick-links";
import { cn } from "@/lib/utils";
import { ChatThread, ConversationList, useMessaging } from "./messaging-shared";

type WidgetState = "collapsed" | "list" | "chat";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatWidgetBadge(count: number) {
  if (count <= 0) return null;
  return count > 3 ? "3" : String(count);
}

export function MessagesWidget() {
  const { data: session } = useSession();
  const [state, setState] = useState<WidgetState>("collapsed");
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
  } = useMessaging();

  const { data: profile } = useQuery({
    queryKey: ["widget-profile"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      const json = await res.json();
      return json.data?.user as {
        fullName?: string | null;
        email?: string;
        image?: string | null;
      } | null;
    },
    enabled: !!session?.user?.id,
  });

  const { data: unread = 0 } = useQuery({
    queryKey: ["messages-unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/messages/unread-count");
      const json = await res.json();
      return Number(json.data?.count ?? 0);
    },
    enabled: !!session?.user?.id,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (state === "chat" && !activeId) {
      setState("list");
    }
  }, [activeId, state]);

  if (!session?.user) return null;

  const displayName =
    profile?.fullName?.trim() || session.user.email?.split("@")[0] || "You";
  const messagesPath = getMessagesPath(session.user.role);
  const title = activeConversation
    ? conversationTitle(activeConversation.participants, currentUserId)
    : "Messaging";
  const badge = formatWidgetBadge(unread);
  const isExpanded = state !== "collapsed";

  return (
    <div className="pointer-events-none fixed bottom-0 right-4 z-50 hidden sm:block">
      <div className="pointer-events-auto flex flex-col items-end gap-0 pb-4">
        <div
          className={cn(
            "flex w-[min(92vw,360px)] origin-bottom flex-col overflow-hidden rounded-t-xl border border-b-0 bg-card shadow-2xl transition-all duration-300 ease-out",
            isExpanded
              ? "translate-y-0 opacity-100"
              : "pointer-events-none max-h-0 translate-y-full opacity-0"
          )}
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-sm font-semibold">
              {state === "chat" ? title : "Messaging"}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" asChild>
                <Link href={messagesPath} aria-label="Open full messaging">
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Minimize messaging"
                onClick={() => {
                  if (state === "chat") {
                    setActiveId(null);
                    setState("list");
                    return;
                  }
                  setState("collapsed");
                }}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "flex min-h-0 transition-[height] duration-300",
              state === "chat" ? "h-[min(72vh,520px)]" : "h-[min(60vh,420px)]"
            )}
          >
            <div
              className={cn(
                "border-r transition-all duration-300 ease-in-out",
                state === "chat" ? "w-[38%] min-w-[38%]" : "w-full"
              )}
            >
              <div className="h-full overflow-y-auto">
                <ConversationList
                  conversations={conversations}
                  activeId={activeId}
                  currentUserId={currentUserId}
                  onSelect={(id) => {
                    setActiveId(id);
                    setState("chat");
                  }}
                  compact
                />
              </div>
            </div>

            <div
              className={cn(
                "min-w-0 flex-1 transition-all duration-300 ease-in-out",
                state === "chat" && activeId
                  ? "translate-x-0 opacity-100"
                  : "w-0 translate-x-4 opacity-0"
              )}
            >
              {state === "chat" && activeId ? (
                <ChatThread
                  messages={messages}
                  currentUserId={currentUserId}
                  title={title}
                  content={content}
                  onContentChange={setContent}
                  onSend={() => sendMutation.mutate()}
                  sending={sendMutation.isPending}
                  typers={typers}
                  heightClass="h-[calc(min(72vh,520px)-3.5rem)]"
                  showHeader={false}
                />
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setState(isExpanded ? "collapsed" : "list")}
          className="flex w-[min(92vw,360px)] items-center gap-3 rounded-t-xl border bg-card px-3 py-2.5 shadow-xl transition hover:bg-muted/40"
        >
          <div className="relative">
            <Avatar className="size-9">
              {(profile?.image ?? session.user.image) ? (
                <AvatarImage
                  src={profile?.image ?? session.user.image ?? undefined}
                  alt={displayName}
                />
              ) : null}
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <span className="flex-1 text-left text-sm font-medium">Messaging</span>
          {badge ? (
            <span className="flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {badge}
            </span>
          ) : null}
          <span
            className="inline-flex"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon-sm" type="button" aria-label="More">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </span>
          <span
            className="inline-flex"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon-sm" asChild>
              <Link href={messagesPath} aria-label="Compose message">
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
