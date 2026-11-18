import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Loader2, X, MessageSquare, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";

export default function SupportChatbot({ open, onClose }) {
  const { language } = useLanguage();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open && !conversation) {
      initializeChat();
    }
  }, [open]);

  const initializeChat = async () => {
    try {
      setInitializing(true);
      const newConversation = await base44.agents.createConversation({
        agent_name: "support_bot",
        metadata: {
          name: "Support Chat",
          description: "Customer support conversation",
          site_language: language === "ar" ? "Arabic" : "English"
        }
      });
      
      setConversation(newConversation);
      setMessages(newConversation.messages || []);
      
      // Subscribe to updates
      const unsubscribe = base44.agents.subscribeToConversation(
        newConversation.id,
        (data) => {
          setMessages(data.messages);
          setLoading(false);
        }
      );

      // Send welcome message
      await base44.agents.addMessage(newConversation, {
        role: "user",
        content: language === "ar" ? "مرحباً" : "Hello"
      });

      return () => unsubscribe();
    } catch (error) {
      toast.error("Failed to initialize chat");
      console.error(error);
    } finally {
      setInitializing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !conversation || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setLoading(true);

    try {
      await base44.agents.addMessage(conversation, {
        role: "user",
        content: userMessage
      });
    } catch (error) {
      toast.error("Failed to send message");
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const MessageBubble = ({ message }) => {
    const isUser = message.role === "user";
    const isAssistant = message.role === "assistant";

    if (!message.content && !message.tool_calls?.length) return null;

    return (
      <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
        {!isUser && (
          <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Bot className="h-4 w-4 text-amber-600" />
          </div>
        )}
        
        <div className={`max-w-[80%] ${isUser && "flex flex-col items-end"}`}>
          {message.content && (
            <div
              className={`rounded-2xl px-4 py-2.5 ${
                isUser
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-900"
              }`}
            >
              {isUser ? (
                <p className="text-sm leading-relaxed">{message.content}</p>
              ) : (
                <ReactMarkdown
                  className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  components={{
                    p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                    ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                    li: ({ children }) => <li className="my-0.5">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          )}
          
          {message.tool_calls?.length > 0 && (
            <div className="mt-1 space-y-1">
              {message.tool_calls.map((toolCall, idx) => (
                <div
                  key={idx}
                  className="text-xs px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-600"
                >
                  {toolCall.status === "running" ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking data...
                    </span>
                  ) : (
                    <span>✓ Data retrieved</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {isUser && (
          <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl h-[600px] flex flex-col shadow-2xl">
        <CardHeader className="border-b bg-gradient-to-r from-amber-500 to-amber-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-white">Support Assistant</CardTitle>
                <p className="text-xs text-white/80 mt-0.5">
                  AI-powered help for your questions
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {initializing ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <p className="text-sm text-slate-500">Initializing chat...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Bot className="h-8 w-8 text-amber-600" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-slate-900">How can I help you?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Ask about cashback, payouts, orders, or anything else!
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {[
                  "Check my cashback balance",
                  "View payout history",
                  "How do I refer friends?",
                  "Track my order"
                ].map((suggestion, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInputMessage(suggestion);
                      setTimeout(() => sendMessage(), 100);
                    }}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, idx) => (
                <MessageBubble key={idx} message={message} />
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-4 bg-slate-50">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading || initializing}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || loading || initializing}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            AI responses may not always be accurate. For urgent issues, contact support.
          </p>
        </div>
      </Card>
    </div>
  );
}