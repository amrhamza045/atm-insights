import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PhoneCall, ClipboardList } from "lucide-react";

const CONFIG = {
  call_centre: {
    title: "Call Center",
    text: "Take orders over the phone and send them to the cashier for approval.",
    path: "/CallCenterPOS",
    open: "Open Call Center POS",
    Icon: PhoneCall,
    box: "bg-blue-50 border-blue-200",
    heading: "text-blue-900",
    body: "text-blue-700",
    icon: "text-blue-500",
    btn: "bg-blue-600 hover:bg-blue-700",
    outline: "border-blue-300 text-blue-700"
  },
  captain: {
    title: "Captain Orders",
    text: "Take table orders from the floor and send them to the cashier for approval.",
    path: "/CaptainPOS",
    open: "Open Captain POS",
    Icon: ClipboardList,
    box: "bg-emerald-50 border-emerald-200",
    heading: "text-emerald-900",
    body: "text-emerald-700",
    icon: "text-emerald-500",
    btn: "bg-emerald-600 hover:bg-emerald-700",
    outline: "border-emerald-300 text-emerald-700"
  }
};

export default function StagedRoleLanding({ role, onQuickForm }) {
  const c = CONFIG[role];
  if (!c) return null;
  const { Icon } = c;
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className={`p-8 border-2 rounded-2xl max-w-md w-full space-y-4 ${c.box}`}>
        <Icon className={`w-16 h-16 mx-auto ${c.icon}`} />
        <h2 className={`text-2xl font-bold ${c.heading}`}>{c.title}</h2>
        <p className={c.body}>{c.text}</p>
        <div className="flex flex-col gap-2">
          <Button asChild className={`w-full gap-2 ${c.btn}`}>
            <Link to={c.path}><Icon className="w-4 h-4" />{c.open}</Link>
          </Button>
          <Button variant="outline" onClick={onQuickForm} className={c.outline}>Quick Order Form</Button>
        </div>
      </div>
    </div>
  );
}