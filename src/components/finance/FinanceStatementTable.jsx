import { financeAmount } from '@/components/finance/financeApi';
export default function FinanceStatementTable({title,rows,company}) {
 return <section className="border rounded-lg bg-card p-4"><h3 className="font-semibold mb-3">{title}</h3><table className="w-full text-sm"><tbody>{rows.map(row=><tr key={row.label} className="border-t"><th className="text-left font-normal p-2">{row.label}</th><td className="text-right p-2 tabular-nums">{financeAmount(row.amount,company)}</td></tr>)}</tbody></table></section>;
}