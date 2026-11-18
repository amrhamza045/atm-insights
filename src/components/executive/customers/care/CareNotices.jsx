import ReportNotice from "@/components/executive/kit/ReportNotice";

// What to know before reading Client Care.
export default function CareNotices({ data: d }) {
  return (
    <>
      {!d.has_activity && <ReportNotice>Nothing was logged with clients in this period, and no follow-ups fell due.</ReportNotice>}
      {d.narrowed && <ReportNotice>Client contacts aren't kept per branch, so this report covers the whole business whatever branches are picked.</ReportNotice>}
      {d.current.care_overdue > 0 && <ReportNotice>Follow-ups past their due day and not done: {d.current.care_overdue}. Each person finds theirs in CRM › Follow-ups.</ReportNotice>}
    </>
  );
}