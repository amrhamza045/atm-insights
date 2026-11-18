import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Receipt } from "lucide-react";
import useOpenTab from "@/hooks/useOpenTab";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import MailConfigTab from "./MailConfigTab";
import ReceiptSettingsTab from "./receipt/ReceiptSettingsTab";

// Catering › Settings › Mail: the email templates and the client receipt, as two sub-tabs.
export default function MailSettingsTab() {
  const view = useOpenTab("CateringMail", ["templates", "receipt"]);
  if (!view.value) return <ClosedTabsNotice />;

  return (
    <Tabs value={view.value} onValueChange={view.setValue} className="space-y-4">
      <TabsList>
        {view.isOpen("templates") && <TabsTrigger value="templates" className="gap-1.5"><Mail className="w-4 h-4" /> Mail templates</TabsTrigger>}
        {view.isOpen("receipt") && <TabsTrigger value="receipt" className="gap-1.5"><Receipt className="w-4 h-4" /> Client Receipt</TabsTrigger>}
      </TabsList>
      <TabsContent value="templates"><MailConfigTab /></TabsContent>
      <TabsContent value="receipt"><ReceiptSettingsTab /></TabsContent>
    </Tabs>
  );
}