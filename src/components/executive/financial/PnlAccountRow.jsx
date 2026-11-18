import ChangeCell from "@/components/executive/kit/ChangeCell";
import { fmtMoney } from "@/components/executive/kit/formatters";

// One account under an open statement section. Budgets are set per section,
// so with Budget chosen an account has no comparison of its own.
export default function PnlAccountRow({ account, goodWhen, currency, byBudget }) {
  return (
    <tr className="border-b border-slate-100 bg-slate-50/70 text-xs text-slate-600">
      <th scope="row" className="py-1.5 pl-8 pr-3 text-left font-normal">
        <span className="tabular-nums text-slate-400">{account.code}</span> {account.name}
      </th>
      <td className="py-1.5 text-right tabular-nums">{fmtMoney(account.current, currency)}</td>
      <td className="py-1.5 pl-3 text-right tabular-nums text-slate-500">
        {byBudget ? <span className="text-slate-400">No budget</span> : fmtMoney(account.previous, currency)}
      </td>
      <td className="py-1.5 pl-3 text-right">
        <ChangeCell value={account.current} previous={byBudget ? null : account.previous} goodWhen={goodWhen} currency={currency} />
      </td>
    </tr>
  );
}