"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { conversationTitle } from "@/lib/messaging/display";
import { cn } from "@/lib/utils";
import { ChatThread, useMessaging } from "./messaging-shared";
import { MessagingListPanel } from "./messaging-list-panel";
import { useSettingsProfile } from "@/hooks/use-settings-profile";

type WidgetState = "collapsed" | "list" | "chat";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatWidgetBadge(count: number) {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

export function MessagesWidget() {
  const { data: session } = useSession();
  const [state, setState] = useState<WidgetState>("collapsed");
  const isExpanded = state !== "collapsed";

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
  } = useMessaging({ enabled: isExpanded });

  const { data: profile } = useSettingsProfile(!!session?.user?.id && isExpanded);

  const { data: unread = 0 } = useQuery({
    queryKey: ["messages-unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/messages/unread-count");
      const json = await res.json();
      return Number(json.data?.count ?? 0);
    },
    enabled: !!session?.user?.id,
    refetchInterval: isExpanded ? 15000 : 60000,
    staleTime: 30_000,
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
  const inChat = state === "chat" && !!activeId;
  const hasConversations = conversations.length > 0;

  function openWidget() {
    setState("list");
  }

  function collapseWidget() {
    setActiveId(null);
    setState("collapsed");
  }

  function toggleWidget() {
    if (isExpanded) {
      collapseWidget();
      return;
    }
    openWidget();
  }

  const iconLauncher = (
    <button
      type="button"
      onClick={toggleWidget}
      aria-label={isExpanded ? "Minimize messaging" : "Open messaging"}
      aria-expanded={isExpanded}
      className="relative mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 md:hidden"
    >
      <MessagesSquare className="size-6" strokeWidth={1.75} />
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
          {badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="pointer-events-none fixed bottom-0 right-2 z-50 sm:right-4">
      <div className="pointer-events-auto flex flex-col items-end">
        <div
          className={cn(
            "origin-bottom flex flex-col overflow-hidden rounded-t-xl border border-b-0 bg-card shadow-2xl transition-all duration-300 ease-out",
            inChat ? "w-[min(100vw-1rem,640px)]" : "w-[min(100vw-1rem,360px)]",
            isExpanded
              ? "translate-y-0 opacity-100"
              : "pointer-events-none max-h-0 translate-y-full opacity-0"
          )}
        >
          <button
            type="button"
            onClick={collapseWidget}
            className="flex w-full items-center gap-2 border-b px-3 py-2.5 text-left transition hover:bg-muted/40"
            aria-label="Minimize messaging"
          >
            <Avatar className="size-8">
              {(profile?.image ?? session.user.image) ? (
                <AvatarImage
                  src={profile?.image ?? session.user.image ?? undefined}
                  alt={displayName}
                />
              ) : null}
              <AvatarFallback className="text-xs">{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {inChat ? title : "Messaging"}
            </p>
            {badge ? (
              <span className="flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {badge}
              </span>
            ) : null}
          </button>

          <div
            className={cn(
              "flex min-h-0",
              inChat ? "h-[min(72vh,520px)]" : "h-[min(60vh,420px)]"
            )}
          >
            {inChat ? (
              <>
                <div className="w-[40%] shrink-0 border-r">
                  <MessagingListPanel
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
              <MessagingListPanel
                conversations={conversations}
                activeId={activeId}
                currentUserId={currentUserId}
                onSelect={(id) => {
                  setActiveId(id);
                  setState("chat");
                }}
                compact
                className="w-full"
              />
            )}
          </div>
        </div>

        {!isExpanded ? (
          <>
            {iconLauncher}
            {!hasConversations ? (
              <button
                type="button"
                onClick={openWidget}
                aria-label="Open messaging"
                className="relative mb-3 hidden size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 md:flex"
              >
                <MessagesSquare className="size-6" strokeWidth={1.75} />
                {badge ? (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {badge}
                  </span>
                ) : null}
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleWidget}
                aria-label="Open messaging"
                aria-expanded={false}
                className="mb-3 hidden w-[min(100vw-1rem,360px)] items-center gap-3 rounded-t-xl border border-b-0 bg-card px-3 py-2.5 shadow-xl transition hover:bg-muted/40 md:flex"
              >
                <Avatar className="size-9">
                  {(profile?.image ?? session.user.image) ? (
                    <AvatarImage
                      src={profile?.image ?? session.user.image ?? undefined}
                      alt={displayName}
                    />
                  ) : null}
                  <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-left text-sm font-medium">Messaging</span>
                {badge ? (
                  <span className="flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {badge}
                  </span>
                ) : null}
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
