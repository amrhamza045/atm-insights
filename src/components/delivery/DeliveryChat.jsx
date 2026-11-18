import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

export default function DeliveryChat({ orderId, orderLabel, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const prevMsgCount = useRef(0);

  useEffect(() => {
    const load = async () => {
      try {
        const filter = orderId ? { order_id: orderId } : {};
        const data = await base44.entities.DeliveryMessage.filter(filter, "created_date", 200);
        setMessages(orderId ? data : data.filter(m => !m.order_id));
        prevMsgCount.current = data.length;
      } catch (e) {
        console.error("Failed to load messages", e);
      }
    };
    load();

    const unsubscribe = base44.entities.DeliveryMessage.subscribe((event) => {
      const msg = event.data;
      if (!msg) return;
      if (orderId && msg.order_id !== orderId) return;
      if (!orderId && msg.order_id) return;

      if (event.type === "create") {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, [orderId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !currentUser) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      await base44.entities.DeliveryMessage.create({
        order_id: orderId || null,
        order_label: orderLabel || null,
        sender_name: currentUser.full_name || currentUser.email,
        sender_email: currentUser.email,
        message_text: text,
        message_type: "text",
      });
    } catch (e) {
      toast.error("Failed to send message");
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-slate-50">
        <MessageSquare className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">
          {orderId ? `Order Chat — ${orderLabel || ""}` : "General Delivery Chat"}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400 mt-8">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_email === currentUser?.email;
            const isStatus = msg.message_type === "status_update";
            if (isStatus) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                    {msg.message_text} — {msg.sender_name} · {moment(msg.created_date).format("HH:mm")}
                  </span>
                </div>
              );
            }
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-lg px-3 py-1.5 ${isMe ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-800"}`}>
                  {!isMe && <p className="text-xs font-semibold mb-0.5">{msg.sender_name}</p>}
                  <p className="text-sm">{msg.message_text}</p>
                  <p className={`text-xs mt-0.5 ${isMe ? "text-amber-100" : "text-slate-400"}`}>
                    {moment(msg.created_date).format("HH:mm")}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-slate-200 flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !sending && sendMessage()}
          placeholder="Type a message..."
          disabled={!currentUser || sending}
          className="flex-1"
        />
        <Button size="icon" onClick={sendMessage} disabled={!input.trim() || sending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}