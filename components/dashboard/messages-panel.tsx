"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function MessagesPanel() {
  const [content, setContent] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/messages");
      const json = await res.json();
      return json.data ?? [];
    },
    refetchInterval: 15000,
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", activeId],
    queryFn: async () => {
      if (!activeId) return [];
      const res = await fetch(`/api/messages/${activeId}`);
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!activeId,
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeId) return;
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, content }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Conversations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          {!conversations?.length ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">No messages yet</p>
          ) : (
            conversations.map((conv: {
              id: string;
              messages: { content: string }[];
              participants: { user: { email: string } }[];
            }) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setActiveId(conv.id)}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-muted ${
                  activeId === conv.id ? "bg-muted" : ""
                }`}
              >
                <p className="font-medium truncate">
                  {conv.participants
                    .map((p) => p.user.email.split("@")[0])
                    .join(", ")}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {conv.messages[0]?.content ?? "No messages"}
                </p>
              </button>
            ))
          )}
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Chat</CardTitle>
        </CardHeader>
        <CardContent>
          {!activeId ? (
            <p className="text-sm text-muted-foreground">Select a conversation</p>
          ) : (
            <div className="space-y-4">
              <div className="h-64 overflow-y-auto rounded-lg border p-4 space-y-2">
                {messages?.length ? (
                  messages.map((m: { id: string; content: string; sender?: { email: string } }) => (
                    <div key={m.id} className="rounded-lg bg-muted px-3 py-2 text-sm">
                      <p className="text-xs text-muted-foreground">{m.sender?.email}</p>
                      <p>{m.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Start the conversation</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && content && sendMutation.mutate()}
                />
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={!content || sendMutation.isPending}
                  onClick={() => sendMutation.mutate()}
                >
                  Send
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
