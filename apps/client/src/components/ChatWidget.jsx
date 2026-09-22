import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Lock, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";

const POLL_MS = 30000;

export default function ChatWidget(){
  const { dark, isAuthenticated, chatMessages, chatLoading, chatError, sendMessage, refreshMessages } = useStore();
  const [open,setOpen]=useState(false);
  const [text,setText]=useState("");
  const [sending,setSending]=useState(false);
  const bodyRef = useRef(null);
  const navigate=useNavigate();

  // Load once when opened. We deliberately do not poll in the background:
  // Firestore quota/rate limits can otherwise turn one open chat into hundreds
  // of repeated requests. Re-opening the panel refreshes the conversation.
  useEffect(() => {
    if (!open || !isAuthenticated) return;
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await refreshMessages();
    };
    load();
    return () => { cancelled = true; };
  }, [open, isAuthenticated, refreshMessages]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [chatMessages, open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    const value = text.trim();
    setText("");
    setSending(true);
    await sendMessage(value);
    setSending(false);
  };

  return <>
    <button className={`chat-launch ${dark?"chat-launch--dark":""}`} onClick={()=>setOpen(v=>!v)} aria-label="Open messages">
      {open?<X size={18}/>:<MessageCircle size={18}/>}<span>Message</span>
    </button>
    <AnimatePresence>
      {open && <motion.aside initial={{opacity:0,y:18,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:18,scale:.97}} className={`chat-panel ${dark?"chat-panel--dark":""}`}>
        <div className="chat-head"><div><span>ARTCANVAS / MESSAGES</span><strong>Studio chat</strong></div><button onClick={()=>setOpen(false)}><X size={16}/></button></div>
        {!isAuthenticated ? <div className="chat-locked"><div className="chat-lock-icon"><Lock size={17}/></div><strong>Sign in to message us.</strong><p>Ask about pieces, sizing, orders or anything in the studio.</p><button onClick={()=>navigate("/account")}>Sign in / Sign up</button></div> : <>
          <div className="chat-body" ref={bodyRef}>
            {chatLoading && chatMessages.length===0 && <div className="chat-empty"><Loader2 size={18} className="animate-spin"/><p>Loading your conversation…</p></div>}
            {!chatLoading && chatMessages.length===0 && <div className="chat-empty"><MessageCircle size={22}/><p>Start a conversation with ArtCanvas.</p></div>}
            {chatMessages.map((m,i)=>{
              const fromUser = m.from!=="admin";
              return (
                <div key={m.id||i} className={`chat-bubble ${fromUser?"chat-bubble--user":""}`} style={m._pending?{opacity:.55}:undefined}>
                  {m.text}
                  <small>{fromUser?"You":"Studio"}</small>
                </div>
              );
            })}
          </div>
          {chatError && <p className="text-[10px] text-[#A8431E] px-4 pb-1">{chatError}</p>}
          <form className="chat-form" onSubmit={submit}>
            <input value={text} onChange={e=>setText(e.target.value)} placeholder="Write a message…" disabled={sending}/>
            <button aria-label="Send" disabled={sending || !text.trim()}>{sending?<Loader2 size={16} className="animate-spin"/>:<Send size={16}/>}</button>
          </form>
        </>}
      </motion.aside>}
    </AnimatePresence>
  </>
}
