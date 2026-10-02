"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import {
  getConversationsForUser,
  isConversationParticipant,
} from "@/lib/mockData/messages";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const ConversationThread = dynamic(
  () =>
    import("@/components/messages/ConversationThread").then((m) => ({
      default: m.ConversationThread,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`flex gap-3 ${i % 2 === 0 ? "" : "justify-end"}`}
          >
            {i % 2 === 0 && (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
            )}
            <div
              className={`h-12 rounded-xl bg-muted animate-pulse ${
                i % 2 === 0 ? "w-48" : "w-40"
              }`}
            />
          </div>
        ))}
      </div>
    ),
  },
);

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const { user, loading } = useCurrentUser();

  const conversation = user
    ? getConversationsForUser(user.uid).find((c) => c.id === conversationId)
    : undefined;

  // Unknown or foreign conversation ids render 404 so the page never reveals
  // that an id exists for someone else.
  if (
    !loading &&
    user &&
    (!conversation || !isConversationParticipant(conversation, user.uid))
  ) {
    notFound();
  }

  return (
    <div className="h-full flex flex-col">
      {conversation && (
        <div className="p-4 border-b flex items-center gap-3">
          <div>
            <h2 className="font-semibold">{conversation.apartment.name}</h2>
            <p className="text-sm text-muted-foreground">
              Host: {conversation.host.first_name} {conversation.host.last_name}
            </p>
          </div>
        </div>
      )}
      <ConversationThread
        conversationId={conversationId}
        apartmentId="mock-apartment-1"
      />
    </div>
  );
}
