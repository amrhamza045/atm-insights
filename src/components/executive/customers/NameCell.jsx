// A client, guest or event in a table: the name with a quieter detail line.
export default function NameCell({ name, detail }) {
  return (
    <span className="block min-w-0 max-w-[16rem]">
      <span className="block truncate text-slate-700" dir="auto">{name}</span>
      {detail && <span className="block truncate text-[11px] text-slate-400" dir="auto">{detail}</span>}
    </span>
  );
}