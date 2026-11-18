export default function ReviewDetailsTables({ sections }) {
  if (!sections.length) return <p className="text-sm text-muted-foreground">No linked details are available for this review.</p>;
  return <div className="space-y-6">{sections.map(section => (
    <section key={section.title} className="space-y-2">
      <h4 className="font-semibold">{section.title}</h4>
      {!section.rows.length ? <p className="text-sm text-muted-foreground">No records available.</p> : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>{section.columns.map(column => <th key={column} className="p-3 text-left font-medium whitespace-nowrap">{column}</th>)}</tr></thead>
            <tbody>{section.rows.map((row, index) => <tr key={index} className="border-t">{row.map((cell, i) => <td key={i} className="p-3 align-top whitespace-pre-wrap">{cell == null || cell === "" ? "—" : cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  ))}</div>;
}