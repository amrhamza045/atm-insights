export default function SetupSteps({ steps }) {
  return (
    <details>
      <summary className="cursor-pointer text-xs font-medium text-slate-700 hover:text-slate-900">How to connect</summary>
      <ol className="mt-2 list-decimal pl-4 space-y-1 text-xs text-slate-600">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </details>
  );
}