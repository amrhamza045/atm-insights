import { useState } from "react";
import SupportChatbot from "@/components/support/SupportChatbot";
import SupportAssistantTab from "@/components/support/SupportAssistantTab";
import VeraKit360Manual from "@/pages/VeraKit360Manual";
import SystemManual from "@/pages/SystemManual";
import ManualBookDownloadBar from "@/components/manual/system/ManualBookDownloadBar";
import useTabTrail from "@/lib/useTabTrail";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import SupportContactTab from "@/components/support/contact/SupportContactTab";

const HELP_TABS = [
  { key: "assistant", label: "AI Assistant" },
  { key: "manual", label: "Module Manual" },
  { key: "user-manual", label: "User Manual" },
  { key: "support", label: "Support" },
];

export default function SupportBotPage() {
  const [chatOpen, setChatOpen] = useState(false);
  // Tabs closed in Admin › Modules (or by AI Assistant / Module & User Manuals) are left out.
  const tabs = useScreenTabs("SupportBot").keep(HELP_TABS);
  const [activeTab] = useTabTrail(tabs);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {tabs.length === 0 && <div className="max-w-3xl mx-auto p-6"><ClosedTabsNotice /></div>}
      {activeTab === "assistant" && <SupportAssistantTab onStartChat={() => setChatOpen(true)} />}
      {activeTab === "manual" && <VeraKit360Manual />}
      {activeTab === "user-manual" && (
        <>
          <ManualBookDownloadBar />
          <SystemManual />
        </>
      )}
      {activeTab === "support" && <SupportContactTab />}
      <SupportChatbot open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}