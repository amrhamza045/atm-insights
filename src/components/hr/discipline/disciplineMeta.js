export const ACTION_TYPES = [
  { value: "verbal_warning", label: "Verbal warning", color: "bg-yellow-100 text-yellow-800" },
  { value: "warning_1", label: "Written notice – Warning 1", color: "bg-orange-100 text-orange-800" },
  { value: "warning_2", label: "Written notice – Warning 2", color: "bg-red-100 text-red-800" },
  { value: "hearing_minutes", label: "Hearing minutes (محاضر تحقيق)", color: "bg-purple-100 text-purple-800" },
];

export const typeMeta = (v) => ACTION_TYPES.find((t) => t.value === v) || { label: v, color: "" };