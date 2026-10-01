"use client";

import dynamic from "next/dynamic";
import { getConversationsForUser } from "@/lib/mockData/messages";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const ConversationList = dynamic(
  () =>
    import("@/components/messages/ConversationList").then((m) => ({
      default: m.ConversationList,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col divide-y">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-12 w-12 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-48 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
);

export default function MessagesPage() {
  const { user, loading } = useCurrentUser();

  if (loading || !user) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <div className="h-6 w-56 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex flex-col divide-y">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-48 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-xl font-semibold">Your Conversations</h1>
      </div>
      <ConversationList
        conversations={getConversationsForUser(user.uid)}
        currentUserId={user.uid}
      />
    </div>
  );
}
