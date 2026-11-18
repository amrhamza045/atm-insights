import ReportNotice from "@/components/executive/kit/ReportNotice";

// Roster gaps that change what Workforce can count.
export default function WorkforceNotices({ data: d }) {
  return (
    <>
      {!d.has_activity && <ReportNotice>No one is on the HR roster for this selection.</ReportNotice>}
      {d.no_hire_date > 0 && <ReportNotice>People employed today without a hire date: {d.no_hire_date}. They count as employed all along and never as hires; add their hire dates in HR › Employees.</ReportNotice>}
      {d.no_department > 0 && <ReportNotice>People employed today without a department: {d.no_department}. They're listed under No department.</ReportNotice>}
      {d.undated > 0 && <ReportNotice>People set to Terminated before leaving days were saved: {d.undated}. They count neither as leavers nor in headcount; leaving days are saved from now on.</ReportNotice>}
    </>
  );
}