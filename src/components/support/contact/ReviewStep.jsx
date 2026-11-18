import { topicLabel } from "./supportTopics";

const Row = ({ label, children }) => (
  <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2.5 last:border-0 sm:flex-row sm:gap-4">
    <span className="w-28 shrink-0 text-sm text-slate-500">{label}</span>
    <span className="whitespace-pre-wrap break-words text-sm text-slate-900">{children}</span>
  </div>
);

export default function ReviewStep({ form, user }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4">
      <Row label="Topic">{topicLabel(form.topic)}</Row>
      <Row label="Priority">{form.priority === "urgent" ? "Urgent" : "Normal"}</Row>
      <Row label="Subject">{form.subject}</Row>
      <Row label="Description">{form.description}</Row>
      <Row label="Your contact">{[user?.full_name, user?.email, form.phone].filter(Boolean).join(" · ")}</Row>
    </div>
  );
}