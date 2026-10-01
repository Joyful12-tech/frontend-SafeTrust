"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { getMessagesForConversation } from "@/lib/mockData/messages";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MessageBubble } from "./MessageBubble";
import { AutomatedEventMessage } from "./AutomatedEventMessage";
import { MessageComposer } from "./MessageComposer";

type ConversationThreadProps = {
  conversationId: string;
  apartmentId: string;
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100%",
    maxHeight: "calc(100vh - 12rem)",
  } satisfies CSSProperties,
  messageList: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "1rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
  } satisfies CSSProperties,
} as const;

export function ConversationThread({
  conversationId,
  apartmentId,
}: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useCurrentUser();
  const messages = user
    ? getMessagesForConversation(conversationId, user.uid)
    : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (loading || !user) {
    return (
      <div style={styles.container}>
        <div style={styles.messageList} aria-busy="true">
          <div className="h-10 w-48 rounded-xl bg-muted animate-pulse self-start" />
          <div className="h-10 w-40 rounded-xl bg-muted animate-pulse self-end" />
          <div className="h-10 w-52 rounded-xl bg-muted animate-pulse self-start" />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.messageList}>
        {messages.map((message) =>
          message.is_automated ? (
            <AutomatedEventMessage key={message.id} message={message} />
          ) : (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender.id === user.uid}
            />
          ),
        )}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        conversationId={conversationId}
        senderId={user.uid}
        apartmentId={apartmentId}
      />
    </div>
  );
}
