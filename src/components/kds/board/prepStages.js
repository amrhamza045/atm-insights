export const PREP_STAGES = [
  { key: "queued", label: "Queued", cls: "bg-slate-100 text-slate-700" },
  { key: "prepping", label: "Prepping", cls: "bg-blue-100 text-blue-700" },
  { key: "cooking", label: "Cooking", cls: "bg-amber-100 text-amber-800" },
  { key: "ready", label: "Ready for handoff", cls: "bg-emerald-100 text-emerald-700" },
  { key: "handed_off", label: "Handed off", cls: "bg-violet-100 text-violet-700" },
];

export const stageOf = (key) => PREP_STAGES.find((s) => s.key === (key || "queued")) || PREP_STAGES[0];
export const nextStage = (key) => {
  const i = PREP_STAGES.findIndex((s) => s.key === (key || "queued"));
  return i >= 0 && i < PREP_STAGES.length - 1 ? PREP_STAGES[i + 1] : null;
};