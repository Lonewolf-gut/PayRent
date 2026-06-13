import { MessagesPanel } from "@/components/dashboard/messages-panel";

export default function LandlordMessagesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Messages</h1>
      <MessagesPanel />
    </div>
  );
}
