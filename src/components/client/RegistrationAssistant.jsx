import React, { useState, useRef, useEffect } from "react";
import { brandName } from "@/lib/brandName";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, Bot, X, MessageCircle, Minimize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function RegistrationAssistant({ compact = false }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content: "🌟 **Welcome to " + brandName() + " Partnership Program!**\n\nI'm here to help you understand our partnership levels and guide you through registration.\n\n**Quick Links:**\n- 🏆 Partner: 5000 EGP → Gains 7000 EGP (40% extra) + 29% Discounts + 100% off delivery\n- 💎 Premium: 2000 EGP → Gains 2400 EGP (20% extra) + 17% Discounts\n- ⭐ Basic: 1000 EGP → Gains 1100 EGP (10% extra)\n\nWhat would you like to know?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(!compact);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: registrationLevels = [] } = useQuery({
    queryKey: ["registrationLevels"],
    queryFn: () => base44.entities.RegistrationLevel.list("sort_order")
  });

  const { data: cashbackTiers = [] } = useQuery({
    queryKey: ["cashbackTiers"],
    queryFn: () => base44.entities.CashbackTier.list("min_referrals")
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      role: "user",
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const formatRegistrationLevels = () => {
        if (registrationLevels.length === 0) return "No registration levels configured.";
        return registrationLevels
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map(level => {
            const bonus = level.registration_fee * (level.welcome_cashback_percentage / 100);
            const totalValue = level.registration_fee + bonus;
            return `- **${level.level_name}**: Fee ${level.registration_fee} EGP → Gains ${totalValue} EGP (${level.welcome_cashback_percentage}% extra)${level.permanent_discount_percentage > 0 ? ` + ${level.permanent_discount_percentage}% Discounts on all purchases` : ""}${level.delivery_discount_percentage > 0 ? ` + ${level.delivery_discount_percentage}% off delivery` : ""}`;
          })
          .join("\n");
      };

      const formatCashbackTiers = () => {
        if (cashbackTiers.length === 0) return "No cashback tiers configured.";
        return cashbackTiers
          .map(tier => 
            `- ${tier.level_name}: ${tier.cashback_percentage_level1 || 0}% for direct referrals (${tier.min_referrals}+ referrals needed)`
          )
          .join("\n");
      };

      const systemPrompt = `You are an enthusiastic AI assistant helping new clients understand and register for ${brandName()} Partnership Program.

**🌟 ${brandName()} Partnership Program - More Than Loyalty! 🌟**

We believe in partnership, growth, and shared success. Join ${brandName()} Partnership Program and turn your love for food into real value — discounts, cashback, rewards, and income from your network.

**A Real Partnership.** At ${brandName()}, we don't believe in one-way loyalty.

**✨ Why Become a ${brandName()} Partner?**
✔ Be a true partner, not just a customer
✔ Get up to 40% extra balance when you register
✔ Enjoy exclusive partner-only privileges
✔ Help expand the ${brandName()} brand while earning rewards
💳 Consistent discounts based on your partnership level for all new purchases
💰 Cashback balance from your network will NEVER END - it keeps growing!
📈 Grow your network and gain:
  • 5% Cashback till 5 customers
  • 10% Cashback till 10 customers  
  • 15% Cashback till 20 customers
  • 20% Cashback for all newly added clients

**🎯 Registration Levels:**
${formatRegistrationLevels()}

**📊 Cashback Tier Structure:**
${formatCashbackTiers()}

**💼 How It Works:**
1. Register in ${brandName()} Partnership Program (Partner, Premium, or Basic)
2. Receive up to 40% extra balance on your account
3. Use your balance for food, rewards, and discounts
4. Share your unique referral code
5. Earn cashback for every new client you bring

**💰 Earn as You Grow:**
🔹 Up to 20% cashback for each new client
🔹 The bigger your network, the higher your cashback  
🔹 Earnings grow with every successful referral
Your connections = your value!

**🎁 Redeem Your Balance Your Way:**
Your balance can be redeemed for:
- Rewards
- Gifts  
- Vouchers
- Discounts
- Payback (cash withdrawal)

**🍽️ Eat. Enjoy. Earn.**
Every order becomes more than a meal - it becomes an opportunity.

**🚀 Create the Future with Us**
By joining ${brandName()} Partnership Program, you become part of ${brandName()} Family - a community built on quality, trust, and growth.

👉 Grow with us. Earn with us. Create the future with ${brandName()}!

**Your Role:**
- Answer questions about registration levels, benefits, costs, and cashback
- Explain how the referral system works
- Help clients understand the value proposition of each tier
- Guide them through the registration process
- Be encouraging, friendly, and helpful
- Use emojis to make the conversation engaging

Be concise and enthusiastic. Always highlight the value and benefits. If asked about payment or technical issues, suggest contacting support.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt + "\n\nUser question: " + input,
        add_context_from_internet: false
      });

      const assistantMessage = {
        id: messages.length + 2,
        role: "assistant",
        content: response
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: messages.length + 2,
        role: "assistant",
        content: "Sorry, I encountered an issue. Please try again or contact support if the problem persists."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    "What's the difference between Partner and Premium?",
    "How much cashback will I earn?",
    "How do I get my referral code?",
    "Can I upgrade my level later?"
  ];

  if (compact && !isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card className={`${compact ? 'fixed bottom-6 right-6 w-96 shadow-2xl z-50' : 'w-full'} ${isMinimized ? 'h-16' : compact ? 'h-[600px]' : 'h-[500px]'} flex flex-col`}>
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Registration Assistant</CardTitle>
              <p className="text-xs text-slate-500">Ask me anything!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {compact && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-8 w-8 p-0"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-amber-500 text-white rounded-br-none"
                      : "bg-slate-100 text-slate-900 rounded-bl-none"
                  }`}
                >
                  <ReactMarkdown
                    className={`text-sm ${
                      message.role === "assistant" ? "prose prose-sm max-w-none" : ""
                    }`}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      li: ({ children }) => <li className="text-sm">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-900 px-4 py-3 rounded-lg rounded-bl-none">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Quick Questions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-slate-500 mb-2">Quick questions:</p>
              <div className="grid grid-cols-1 gap-1">
                {quickQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => setInput(question)}
                    className="text-left px-3 py-1.5 bg-amber-50 rounded text-xs text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t p-3 bg-white">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about registration..."
                disabled={loading}
                className="flex-1 text-sm"
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </>
      )}
    </Card>
  );
}