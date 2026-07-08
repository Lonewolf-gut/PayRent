"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { conversationTitle } from "@/lib/messaging/display";
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
  const title = activeConversation
    ? conversationTitle(activeConversation.participants, currentUserId)
    : "Messaging";
  const badge = formatWidgetBadge(unread);
  const isExpanded = state !== "collapsed";
  const inChat = state === "chat" && !!activeId;

  return (
    <div className="pointer-events-none fixed bottom-0 right-4 z-50 hidden sm:block">
      <div className="pointer-events-auto flex flex-col items-end">
        <div
          className={cn(
            "origin-bottom flex flex-col overflow-hidden rounded-t-xl border border-b-0 bg-card shadow-2xl transition-all duration-300 ease-out",
            inChat ? "w-[min(92vw,640px)]" : "w-[min(92vw,360px)]",
            isExpanded
              ? "translate-y-0 opacity-100"
              : "pointer-events-none max-h-0 translate-y-full opacity-0"
          )}
        >
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {inChat ? title : "Messaging"}
            </p>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Minimize messaging"
              onClick={() => {
                if (inChat) {
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

          <div
            className={cn(
              "flex min-h-0",
              inChat ? "h-[min(72vh,520px)]" : "h-[min(60vh,420px)]"
            )}
          >
            {inChat ? (
              <>
                <div className="w-[38%] shrink-0 overflow-y-auto border-r">
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
                <div className="min-w-0 flex-1">
                  <ChatThread
                    messages={messages}
                    currentUserId={currentUserId}
                    title={title}
                    content={content}
                    onContentChange={setContent}
                    onSend={() => sendMutation.mutate()}
                    sending={sendMutation.isPending}
                    typers={typers}
                    compact
                    showHeader={false}
                  />
                </div>
              </>
            ) : (
              <div className="h-full w-full overflow-y-auto">
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
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setState(isExpanded ? "collapsed" : "list")}
          className="flex w-[min(92vw,360px)] items-center gap-3 rounded-t-xl border border-b-0 bg-card px-3 py-2.5 shadow-xl transition hover:bg-muted/40"
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
