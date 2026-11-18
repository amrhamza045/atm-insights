// Rosemary colours for Executive Dashboard charts (the brand navy and gold),
// plus the green / red used for better / worse. They read the design tokens.
export const BRAND = { navy: "hsl(var(--landing-navy))", gold: "hsl(var(--landing-gold))" };
export const STATUS = { good: "hsl(var(--success-600))", bad: "hsl(var(--danger-600))" };
export const AXIS = { tick: { fontSize: 11, fill: "hsl(var(--muted-foreground))" }, tickLine: false, axisLine: false };
export const GRID = { strokeDasharray: "3 3", stroke: "hsl(var(--border))", vertical: false };
export const TOOLTIP = { contentStyle: { borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 } };