"use client";

import { useEffect } from "react";
import { useOptionalChatDock } from "@/components/messages/ChatDockProvider";

/** Bind the server session user id into the client chat dock. */
export function ChatDockSession({
  currentUserId,
}: {
  currentUserId: string | null;
}) {
  const dock = useOptionalChatDock();
  const setCurrentUserId = dock?.setCurrentUserId;
  useEffect(() => {
    setCurrentUserId?.(currentUserId);
  }, [setCurrentUserId, currentUserId]);
  return null;
}
