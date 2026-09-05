import { getProfileDisplayName } from "@/lib/utils/display-name";
import type { MessageSender } from "@/lib/messaging/types";

type RawUser = {
  id: string;
  email: string;
  image: string | null;
  tenant?: {
    fullName: string | null;
    companyName: string | null;
    entityType: string | null;
  } | null;
  landlord?: {
    fullName: string | null;
    companyName: string | null;
    entityType: string | null;
  } | null;
  lender?: { fullName: string | null } | null;
  agentProfile?: { fullName: string | null } | null;
};

export const MESSAGE_USER_SELECT = {
  id: true,
  email: true,
  image: true,
  tenant: {
    select: { fullName: true, companyName: true, entityType: true },
  },
  landlord: {
    select: { fullName: true, companyName: true, entityType: true },
  },
  lender: { select: { fullName: true } },
  agentProfile: { select: { fullName: true } },
} as const;

export function mapMessageUser(user: RawUser): MessageSender {
  const profile =
    user.tenant ?? user.landlord ?? user.lender ?? user.agentProfile ?? null;
  const displayName =
    getProfileDisplayName({
      entityType: user.tenant?.entityType ?? user.landlord?.entityType ?? null,
      fullName:
        user.tenant?.fullName ??
        user.landlord?.fullName ??
        user.lender?.fullName ??
        user.agentProfile?.fullName ??
        null,
      companyName: user.tenant?.companyName ?? user.landlord?.companyName ?? null,
    }) ?? user.email.split("@")[0];

  return {
    id: user.id,
    email: user.email,
    image: user.image,
    displayName,
  };
}

export function conversationTitle(
  participants: MessageSender[],
  currentUserId: string
) {
  const others = participants.filter((p) => p.id !== currentUserId);
  if (!others.length) return "Conversation";
  return others.map((p) => p.displayName).join(", ");
}
