import ReportNotice from "@/components/executive/kit/ReportNotice";

// Gaps in the period's events that change what Clients & Retention can count.
export default function ClientsNotices({ data: d }) {
  return (
    <>
      {!d.has_activity && <ReportNotice>No events were delivered in this period for this selection.</ReportNotice>}
      {d.no_client > 0 && <ReportNotice>Delivered events with no client linked: {d.no_client}. Their bills count in revenue but towards no client; link each event to its client in Catering.</ReportNotice>}
      {d.unbilled > 0 && <ReportNotice>Delivered events without a final bill yet: {d.unbilled}. Their clients count as served, but their revenue comes in once each final bill is confirmed in Catering.</ReportNotice>}
    </>
  );
}