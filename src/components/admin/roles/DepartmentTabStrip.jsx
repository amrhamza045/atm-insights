export default function DepartmentTabStrip({ departments, value, onChange }) {
  const tabs = [{ key: "__all", label: "All" }, ...departments.map((d) => ({ key: d.name, label: d.name }))];
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
            value === tab.key
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}