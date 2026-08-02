"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

type Conversation = {
  id: string;
  title?: string;
  post_id?: string;
  last_message?: string;
  updated_at?: string;
};

type Message = {
  id: string;
  body?: string;
  sender_id?: string;
  created_at?: string;
};

export function MessagesClient({
  lang,
  initialConversations,
  initialConversationId = null,
}: {
  lang: Lang;
  initialConversations: Conversation[];
  initialConversationId?: string | null;
}) {
  const [conversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    () => initialConversationId || conversations[0]?.id || null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/messages/${activeId}`);
        const data = await res.json().catch(() => ({ data: [] }));
        if (!cancelled) setMessages(Array.isArray(data.data) ? data.data : []);
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const send = async () => {
    if (!activeId || !draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    const res = await fetch(`/api/messages/${activeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.data || {
        id: String(Date.now()),
        body,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, msg]);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6">
      <h1 className="text-xl font-bold text-slate-900 mb-5">
        {t(lang, "messages.title")}
      </h1>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[480px]">
        <aside className="border-b md:border-b-0 md:border-r border-slate-100">
          {conversations.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">{t(lang, "messages.empty")}</p>
          ) : (
            <ul>
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 ${
                      activeId === c.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {c.title || c.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {c.last_message || ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section className="flex flex-col">
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
              {t(lang, "messages.empty")}
            </div>
          ) : (
            <>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[420px]">
                {loading && (
                  <p className="text-xs text-slate-400">{t(lang, "common.loading")}</p>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className="bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-700 max-w-[80%]"
                  >
                    {m.body}
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-100 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                  placeholder={t(lang, "messages.placeholder")}
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20"
                />
                <button
                  type="button"
                  onClick={send}
                  className="px-4 py-2 bg-[#1E6FE8] text-white text-sm font-medium rounded-full"
                >
                  {t(lang, "detail.send")}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
      <p className="mt-4 text-xs text-slate-400">
        <Link href="/app/pet-feed" className="text-[#1E6FE8]">
          ← {t(lang, "nav.browse")}
        </Link>
      </p>
    </div>
  );
}
