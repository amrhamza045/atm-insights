import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Bot, Zap, Shield, Clock, ArrowRight } from "lucide-react";

const HELP_TOPICS = [
  ["Account Information", "Check cashback balance, payout status, and transaction history"],
  ["How-To Guides", "Learn how to refer friends, redeem rewards, and place orders"],
  ["Order Tracking", "Check the status of your orders and delivery information"],
  ["Program Information", "Understand cashback tiers, loyalty rewards, and benefits"],
  ["Payout Requests", "Get help with withdrawal process and payout history"],
  ["FAQs", "Quick answers to frequently asked questions"],
];

const SAMPLE_QUESTIONS = [
  "What's my current cashback balance?",
  "How do I request a payout?",
  "Show me my recent orders",
  "How does the referral program work?",
  "What tier am I in?",
  "How do I redeem rewards?",
  "Check my payout history",
  "What are the registration levels?",
];

export default function SupportAssistantTab({ onStartChat }) {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg">
          <Bot className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900">AI Support Assistant</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Get instant help with your questions about cashback, payouts, orders, and more
        </p>
        <Button size="lg" onClick={onStartChat} className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg">
          <MessageSquare className="mr-2 h-5 w-5" />
          Start Chat
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <Zap className="h-8 w-8 text-amber-500 mb-2" />
            <CardTitle className="text-lg">Instant Answers</CardTitle>
            <CardDescription>Get immediate responses to common questions about the platform</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <Clock className="h-8 w-8 text-amber-500 mb-2" />
            <CardTitle className="text-lg">24/7 Available</CardTitle>
            <CardDescription>Support available anytime, day or night, whenever you need help</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <Shield className="h-8 w-8 text-amber-500 mb-2" />
            <CardTitle className="text-lg">Smart Escalation</CardTitle>
            <CardDescription>Complex issues are automatically escalated to human agents</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>What Can the AI Help With?</CardTitle>
          <CardDescription>Our AI assistant can answer questions and help you with:</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {HELP_TOPICS.map(([title, desc]) => (
              <div key={title} className="flex items-start gap-3">
                <ArrowRight className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">{title}</p>
                  <p className="text-sm text-slate-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Try Asking...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((question) => (
              <Button key={question} variant="outline" size="sm" onClick={onStartChat} className="text-sm">
                {question}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}