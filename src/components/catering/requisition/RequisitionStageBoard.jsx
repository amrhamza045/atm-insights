import React, { useMemo } from "react";
import RequisitionSummary from "./RequisitionSummary";

export const REQUISITION_BOARD_CSS = `
.req-board {
  box-sizing: border-box;
  width: 100%;
  padding: 34px;
  background: #f7f5ef;
  color: #18314b;
  border: 1px solid #d9d3c6;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
  overflow: hidden;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
@media (max-width: 1024px) {
  .req-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 20px;
  }
}
@media (max-width: 640px) {
  .req-board {
    grid-template-columns: minmax(0, 1fr);
    padding: 14px;
  }
}
.req-lane {
  min-width: 0;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 17px;
  background: #fffefa;
  border: 1px solid #e5dfd2;
  border-radius: 14px;
  box-shadow: 0 8px 24px #18314b0b;
}
.req-group-label {
  padding: 0 2px 12px;
  border-bottom: 1px solid #e8e1d3;
  color: #18314b;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.025em;
}
.req-card {
  box-sizing: border-box;
  width: 100%;
  padding: 14px 15px;
  background: #fff;
  border: 1px solid #e4dfd4;
  border-left: 3px solid #b29a62;
  border-radius: 10px;
  color: #18314b;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  animation: req-arrive 0.55s cubic-bezier(0.2, 0.75, 0.25, 1) both;
}
.req-card:nth-child(2) {
  animation-delay: 0.11s;
}
.req-urgent {
  border-left-color: #b29a62;
  animation: req-arrive 0.55s cubic-bezier(0.2, 0.75, 0.25, 1) both, req-glow 3.2s ease-in-out 0.55s infinite;
}
.req-card:hover {
  background: #fbf8f0;
  border-color: #b9a675;
  box-shadow: 0 7px 18px #18314b12;
}
.req-urgent:hover {
  border-color: #b29a62;
  box-shadow: 0 0 0 1px #b29a6255, 0 7px 18px #18314b12;
}
.req-card:active {
  transform: scale(0.995);
}
.req-card:focus-visible {
  outline: 2px solid #b29a62;
  outline-offset: 3px;
}
.req-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
.req-number {
  font-size: 15px;
  font-weight: 750;
  letter-spacing: 0.015em;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.req-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}
.req-badge {
  padding: 5px 8px;
  border: 1px solid #e3ddcf;
  border-radius: 999px;
  background: #f7f5ef;
  color: #526174;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.25;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.req-badge.req-green {
  color: #285c49;
  background: #eaf3ed;
  border-color: #cbded0;
}
.req-event {
  font-size: 16px;
  font-weight: 650;
  line-height: 1.4;
  letter-spacing: -0.02em;
}
.req-date {
  color: #788392;
  font-weight: 500;
}
.req-meta {
  padding-top: 9px;
  border-top: 1px solid #eee9df;
  color: #697587;
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.req-lane:nth-child(3) .req-card {
  border-left-color: #b29a62;
}
.req-lane:nth-child(3) .req-badge.req-green {
  color: #526174;
  background: #f7f5ef;
  border-color: #e3ddcf;
}
@keyframes req-arrive {
  from {
    opacity: 0;
    transform: translateY(9px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes req-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 #b29a6200;
  }
  50% {
    box-shadow: 0 0 0 1px #b29a6250, 0 0 18px #b29a6218;
  }
}
`;

function groupRequisitionsByEvent(rows, urgentSide) {
  const map = new Map();
  for (const r of rows || []) {
    const key = r.event_id || r.event_name || r.id;
    if (!map.has(key)) {
      map.set(key, {
        key,
        eventName: r.event_name || "—",
        eventDate: r.event_date || "",
        items: [],
      });
    }
    map.get(key).items.push(r);
  }

  const groups = [...map.values()];
  for (const g of groups) {
    g.items.sort((a, b) => {
      const aUrgent = a.awaiting_side === urgentSide ? 0 : a.status !== "fulfilled" ? 1 : 2;
      const bUrgent = b.awaiting_side === urgentSide ? 0 : b.status !== "fulfilled" ? 1 : 2;
      if (aUrgent !== bUrgent) return aUrgent - bUrgent;
      return (Number(b.requisition_sequence) || 1) - (Number(a.requisition_sequence) || 1);
    });
    g.priority = g.items.some((r) => r.awaiting_side === urgentSide)
      ? 0
      : g.items.some((r) => r.status !== "fulfilled" && r.awaiting_side !== "none")
      ? 1
      : 2;
  }

  groups.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return String(a.eventDate || "").localeCompare(String(b.eventDate || ""));
  });

  return groups;
}

export default function RequisitionStageBoard({
  rows = [],
  urgentSide = "chef",
  dueByRequisition,
  today,
  onOpen,
}) {
  const groups = useMemo(() => groupRequisitionsByEvent(rows, urgentSide), [rows, urgentSide]);

  return (
    <>
      <style>{REQUISITION_BOARD_CSS}</style>
      <div className="req-board">
        {groups.map((group) => (
          <section key={group.key} className="req-lane">
            <div className="req-group-label">{group.eventName}</div>
            {group.items.map((r) => (
              <RequisitionSummary
                key={r.id}
                inBoard
                requisition={r}
                urgent={r.awaiting_side === urgentSide}
                showEventName={false}
                dueBatches={dueByRequisition?.get(r.id)}
                today={today}
                onOpen={() => onOpen(r.id)}
              />
            ))}
          </section>
        ))}
      </div>
    </>
  );
}