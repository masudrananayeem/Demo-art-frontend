import React, { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, Trash2, CheckCheck, Circle } from "lucide-react";
import { api } from "@/lib/art-api";

export default function AdminMessages() {
  const [threads, setThreads] = useState(null);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState(null);
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const bodyRef = useRef(null);

  const loadThreads = async () => {
    try {
      const d = await api.adminMessageThreads();
      setThreads(Array.isArray(d) ? d : []);
      setError("");
    } catch (e) {
      setError(e.message || "Could not load inbox.");
    }
  };

  const loadMessages = async (uid) => {
    try {
      const d = await api.adminMessagesFor(uid);
      setMessages(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(e.message || "Could not load conversation.");
    }
  };

  useEffect(() => { loadThreads(); }, []);
  useEffect(() => {
    if (!active) return undefined;
    loadMessages(active.uid);
    return undefined;
  }, [active]);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  const open = async (thread) => {
    setActive(thread);
    setMessages(null);
    setError("");
    try {
      await api.adminMarkMessagesRead(thread.uid);
      setThreads((current) => (current || []).map((t) => t.uid === thread.uid ? { ...t, unreadCount: 0 } : t));
      await loadMessages(thread.uid);
    } catch (e) {
      setError(e.message || "Could not open conversation.");
    }
  };

  const lookup = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy("lookup");
    try {
      const found = await api.adminLookupEmail(email.trim());
      await open(found);
      setEmail("");
    } catch (e) {
      setError(e.message || "Could not find customer.");
    } finally {
      setBusy("");
    }
  };

  const reply = async (e) => {
    e.preventDefault();
    if (!active || !text.trim()) return;
    setBusy("send");
    try {
      await api.adminSendMessage(active.uid, text.trim());
      setText("");
      await Promise.all([loadMessages(active.uid), loadThreads()]);
    } catch (e) {
      setError(e.message || "Could not send reply.");
    } finally {
      setBusy("");
    }
  };

  const deleteMessage = async (m) => {
    if (!confirm("Delete this message?")) return;
    setBusy(`del:${m.id}`);
    try {
      await api.adminDeleteMessage(active.uid, m.id);
      setMessages((cur) => (cur || []).filter((x) => x.id !== m.id));
      await loadThreads();
    } catch (e) {
      setError(e.message || "Could not delete message.");
    } finally {
      setBusy("");
    }
  };

  const deleteThread = async () => {
    if (!active) return;
    if (!confirm(`Delete the entire conversation with ${active.email || "this client"}?`)) return;
    setBusy("thread");
    try {
      await api.adminDeleteMessageThread(active.uid);
      setActive(null);
      setMessages(null);
      await loadThreads();
    } catch (e) {
      setError(e.message || "Could not delete conversation.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mt-2 grid md:grid-cols-[300px_1fr] gap-5 min-h-[500px]">
      <aside className="space-y-4">
        <form onSubmit={lookup} className="flex gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="client@email.com" className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-current/15 bg-transparent text-xs" />
          <button disabled={busy === "lookup" || !email.trim()} className="px-4 rounded-full bg-black text-white text-[10px] uppercase font-semibold">{busy === "lookup" ? "…" : "Open"}</button>
        </form>

        {error && <p className="text-xs text-[#A8431E] border border-[#A8431E]/20 rounded-lg px-3 py-2">{error}</p>}

        <div>
          <div className="flex justify-between items-center mb-2">
            <div><p className="text-xs uppercase tracking-widest opacity-50">Inbox</p><p className="text-[10px] opacity-40 mt-1">Green dot = unseen customer message</p></div>
            <button type="button" onClick={loadThreads} className="text-[10px] uppercase opacity-60">Refresh</button>
          </div>

          {threads === null ? <p className="text-xs opacity-50">Loading…</p> : threads.length === 0 ? <p className="text-xs opacity-50">No conversations.</p> : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {threads.map((t) => {
                const unread = Number(t.unreadCount || 0) > 0;
                return (
                  <button key={t.uid} type="button" onClick={() => open(t)} className={`w-full text-left px-3 py-3 rounded-xl border ${active?.uid === t.uid ? "border-current/50 bg-current/5" : "border-current/10"}`}>
                    <div className="flex items-center gap-2">
                      {unread ? <Circle size={8} fill="currentColor" className="shrink-0" /> : <CheckCheck size={12} className="opacity-35 shrink-0" />}
                      <p className="text-xs font-semibold truncate flex-1">{t.email || "Client"}</p>
                      {unread && <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-current/10">{t.unreadCount} new</span>}
                    </div>
                    <p className="text-[11px] opacity-50 truncate mt-1">{t.lastFrom === "admin" ? "You: " : ""}{t.lastText}</p>
                    <div className="flex justify-between gap-2 mt-2 text-[9px] uppercase opacity-35"><span>{unread ? "Unseen" : "Seen"}</span><span>{t.lastAt ? new Date(t.lastAt).toLocaleDateString() : ""}</span></div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <section className="border border-current/10 rounded-2xl flex flex-col overflow-hidden min-w-0">
        {!active ? (
          <div className="m-auto text-center opacity-45 p-10"><MessageCircle size={28} className="mx-auto mb-3" /><p className="text-sm">Select a client conversation.</p></div>
        ) : (
          <>
            <header className="px-5 py-4 border-b border-current/10 flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="font-semibold text-sm truncate">{active.name || active.email || "Client"}</p><p className="text-xs opacity-45 truncate">{active.email || "Admin inbox"} · replies are emailed to the client</p></div>
              <button type="button" onClick={deleteThread} disabled={busy === "thread"} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#A8431E]/25 text-[#A8431E] text-[10px] uppercase font-semibold">{busy === "thread" ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete inbox</button>
            </header>

            <div ref={bodyRef} className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[460px]">
              {messages === null ? <p className="text-xs opacity-50">Loading…</p> : messages.length === 0 ? <p className="text-xs opacity-50">No messages.</p> : messages.map((m) => (
                <div key={m.id} className={`group flex ${m.from === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] flex items-end gap-2 ${m.from === "admin" ? "flex-row-reverse" : ""}`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${m.from === "admin" ? "bg-black text-white rounded-br-sm" : "bg-current/5 rounded-bl-sm"}`}>
                      <div>{m.text}</div>
                      <div className="text-[8px] opacity-45 mt-1">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ""} {m.from === "user" && m.seenByAdmin ? "· seen" : ""}</div>
                    </div>
                    <button type="button" onClick={() => deleteMessage(m)} disabled={busy === `del:${m.id}`} title="Delete message" className="w-7 h-7 rounded-full border border-current/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[#A8431E]">{busy === `del:${m.id}` ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}</button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={reply} className="p-4 border-t border-current/10 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply…" className="flex-1 px-3 py-2.5 rounded-full border border-current/15 bg-transparent text-sm" />
              <button type="submit" disabled={busy === "send" || !text.trim()} className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-50">{busy === "send" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
