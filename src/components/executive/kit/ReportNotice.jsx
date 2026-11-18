// A short note above a report's figures: something left out or worth a look.
export default function ReportNotice({ children }) {
  return <p role="status" className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">{children}</p>;
}