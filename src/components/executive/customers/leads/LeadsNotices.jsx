import ReportNotice from "@/components/executive/kit/ReportNotice";

// What to know before reading Leads & Sources.
export default function LeadsNotices({ data: d }) {
  return (
    <>
      {!d.has_activity && <ReportNotice>No leads were entered in this period.</ReportNotice>}
      {d.narrowed && <ReportNotice>Leads aren't kept per branch, so this report covers the whole business whatever branches are picked.</ReportNotice>}
      {d.waiting.over_two_days > 0 && <ReportNotice>Leads waiting more than two days for a first contact: {d.waiting.over_two_days}. They're listed as New in CRM › Leads.</ReportNotice>}
    </>
  );
}